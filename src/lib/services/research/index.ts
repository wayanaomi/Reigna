import { z } from "zod";
import type { ResearchSignal } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  tavilyProvider,
  type TavilySearchResult,
} from "@/lib/providers/tavily";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { ProviderError } from "@/lib/providers/http";
import { contactsService } from "@/lib/services/contacts";

export interface ResearchOutcome {
  configured: boolean;
  summary?: string;
  signals?: ResearchSignal[];
  recommendation?: string;
  whyThisPerson?: string;
  error?: string;
}

/**
 * Research service boundary.
 *
 * Reigna gathers real public evidence through Tavily and uses Claude only
 * to organize/select that evidence.
 *
 * IMPORTANT:
 * Claude is NOT trusted to write the factual `detail` of a research signal.
 * The stored signal detail comes directly from a Tavily result.
 *
 * This prevents the research layer from turning an inference such as:
 *
 *   "Femi has experience in cloud architecture"
 *
 * into an unsupported claim such as:
 *
 *   "Femi is currently investing in cloud infrastructure."
 *
 * The personalization layer can then use the supplied evidence safely.
 */
export interface ResearchService {
  isConfigured(): boolean;
  researchContact(
    ownerId: string,
    contactId: string
  ): Promise<ResearchOutcome>;
}

/**
 * Claude is allowed to:
 *
 * - summarize the research
 * - explain why the person is relevant
 * - make a recommendation
 * - choose which source should become a signal
 * - give the signal a short descriptive label
 *
 * Claude is NOT allowed to provide the factual detail itself.
 */
const SynthesisSchema = z.object({
  summary: z.string().min(1),
  whyThisPerson: z.string().min(1),
  recommendation: z.string().min(1),

  signals: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        sourceIndex: z.number().int().min(0),
      })
    )
    .max(6),
});

function dedupeByUrl(
  results: TavilySearchResult[]
): TavilySearchResult[] {
  const seen = new Set<string>();
  const out: TavilySearchResult[] = [];

  for (const result of results) {
    if (!result.url) continue;

    if (seen.has(result.url)) continue;

    seen.add(result.url);
    out.push(result);
  }

  return out;
}

/**
 * Clean a source snippet before storing it as evidence.
 *
 * We deliberately do NOT rewrite the factual meaning.
 * The purpose here is only to remove excessive whitespace and keep the
 * original source wording intact.
 */
function cleanSourceSnippet(snippet: string): string {
  return snippet
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the evidence list Claude is allowed to inspect.
 *
 * The source index is important because the final signal must point back
 * to a real Tavily result.
 */
function buildEvidenceList(
  sources: TavilySearchResult[]
): string {
  return sources
    .map(
      (source, index) =>
        `[${index}]
Title: ${source.title}
URL: ${source.url}
Evidence: ${cleanSourceSnippet(source.snippet).slice(0, 700)}`
    )
    .join("\n\n");
}

async function synthesize(
  company: string,
  domain: string | undefined,
  personName: string,
  title: string,
  sources: TavilySearchResult[]
): Promise<z.infer<typeof SynthesisSchema> | null> {
  const system =
    "You are the evidence-selection layer for Reigna, a research-driven B2B outbound platform. " +
    "Your job is to organize real public evidence supplied by Tavily. " +
    "You must NEVER invent facts. " +
    "You must NEVER turn an inference into a factual claim. " +
    "You must NEVER assume a business problem, buying intent, investment, expansion plan, operational difficulty, " +
    "priority, client need, coordination problem, or business requirement unless the supplied evidence explicitly states it. " +
    "You may select useful evidence and give it a short neutral label. " +
    "The actual factual detail of every signal will be taken directly from the supplied source by Reigna after your response. " +
    "Therefore, DO NOT write a signal detail. " +
    "Only return the source index and a short label describing the topic of that source. " +
    "Labels must be neutral categories such as 'Cloud Architecture', 'Community Leadership', " +
    "'Multi-Region Operations', 'Company Activity', or 'Technology Focus'. " +
    "Do not put claims or conclusions into the label. " +
    "If the evidence is weak or ambiguous, return fewer signals rather than inventing one. " +
    "Respond with JSON only in this exact shape: " +
    '{"summary": string, "whyThisPerson": string, "recommendation": string, ' +
    '"signals": [{"label": string, "sourceIndex": number}]}';

  const evidenceList = buildEvidenceList(sources);

  const userPrompt =
    `Company: ${company}\n` +
    `Domain: ${domain ?? "unknown"}\n` +
    `Decision-maker: ${personName} (${title})\n\n` +
    `REAL PUBLIC EVIDENCE:\n${evidenceList}\n\n` +
    "SELECTION RULES:\n" +
    "1. Select only sources that contain useful, specific evidence about the company or person.\n" +
    "2. Every selected signal must reference exactly one source index.\n" +
    "3. Do not invent facts that are not in the evidence.\n" +
    "4. Do not convert an observation into an unsupported business conclusion.\n" +
    "5. Do not infer buying intent.\n" +
    "6. Do not infer a pain point from someone's job title.\n" +
    "7. Do not infer operational problems from geography, company size, offices, technology, or community activity.\n" +
    "8. Do not write factual signal details. Reigna will copy the evidence detail directly from the selected source.\n" +
    "9. Prefer sources that directly mention the person, company, activity, technology, leadership, or organization.\n" +
    "10. Return fewer signals if the evidence does not support more.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await anthropicProvider.completeJson(
        system,
        userPrompt,
        1200
      );

      const parsed = SynthesisSchema.safeParse(raw);

      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // Retry once.
    }
  }

  return null;
}

/**
 * Converts Claude's source selection into actual ResearchSignal records.
 *
 * The important security/evidence property is that `detail` is NOT taken
 * from Claude. It is taken directly from the Tavily source selected by
 * sourceIndex.
 */
function buildSignals(
  synthesis: z.infer<typeof SynthesisSchema>,
  sources: TavilySearchResult[]
): ResearchSignal[] {
  const signals: ResearchSignal[] = [];
  const seenSourceIndexes = new Set<number>();

  for (const selected of synthesis.signals) {
    const sourceIndex = selected.sourceIndex;

    if (
      sourceIndex < 0 ||
      sourceIndex >= sources.length
    ) {
      continue;
    }

    if (seenSourceIndexes.has(sourceIndex)) {
      continue;
    }

    const source = sources[sourceIndex];

    if (!source?.url || !source?.snippet) {
      continue;
    }

    const detail = cleanSourceSnippet(source.snippet);

    if (!detail) {
      continue;
    }

    seenSourceIndexes.add(sourceIndex);

    signals.push({
      label: selected.label.trim(),
      detail,
      source: source.url,
    });
  }

  return signals;
}

class TavilyResearchService implements ResearchService {
  isConfigured(): boolean {
    return (
      tavilyProvider.isConfigured() &&
      anthropicProvider.isConfigured()
    );
  }

  async researchContact(
    ownerId: string,
    contactId: string
  ): Promise<ResearchOutcome> {
    if (!this.isConfigured()) {
      return {
        configured: false,
      };
    }

    if (!isDatabaseConfigured || !prisma) {
      return {
        configured: true,
        error: "No database connection.",
      };
    }

    const contact = await contactsService.getById(
      ownerId,
      contactId
    );

    if (!contact) {
      return {
        configured: true,
        error: "Contact not found.",
      };
    }

    const run = await prisma.researchRun.create({
      data: {
        contactId,
        status: "PENDING",
      },
    });

    try {
      /**
       * Run the four research paths in parallel.
       *
       * These are all real Tavily searches.
       */
      const [
        domainResults,
        companyResults,
        personResults,
        signalResults,
      ] = await Promise.all([
        contact.companyDomain
          ? tavilyProvider.researchDomain(
              contact.companyDomain
            )
          : Promise.resolve([]),

        tavilyProvider.researchCompanyName(
          contact.company
        ),

        tavilyProvider.researchPerson(
          contact.name,
          contact.company
        ),

        tavilyProvider.researchBusinessSignals(
          contact.company
        ),
      ]);

      /**
       * Combine and deduplicate all real sources.
       */
      const sources = dedupeByUrl([
        ...domainResults,
        ...companyResults,
        ...personResults,
        ...signalResults,
      ]);

      if (sources.length === 0) {
        await prisma.researchRun.update({
          where: {
            id: run.id,
          },
          data: {
            status: "FAILED",
            error: "No public research evidence found.",
            completedAt: new Date(),
          },
        });

        return {
          configured: true,
          error:
            "Reigna couldn't find any public evidence for this contact yet.",
        };
      }

      /**
       * Persist the raw research sources first.
       *
       * This gives us an auditable record of what Tavily actually returned.
       */
      await prisma.researchSource.createMany({
        data: sources.map((source) => ({
          researchRunId: run.id,
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          publishedAt: source.publishedAt
            ? new Date(source.publishedAt)
            : undefined,
        })),
      });

      /**
       * Claude selects useful sources and gives them neutral labels.
       *
       * It does NOT generate the factual signal detail.
       */
      const synthesis = await synthesize(
        contact.company,
        contact.companyDomain,
        contact.name,
        contact.title,
        sources
      );

      if (!synthesis) {
        await prisma.researchRun.update({
          where: {
            id: run.id,
          },
          data: {
            status: "FAILED",
            error: "AI synthesis failed.",
            completedAt: new Date(),
          },
        });

        return {
          configured: true,
          error:
            "Reigna couldn't complete the research pass.",
        };
      }

      /**
       * Build the final signals directly from Tavily evidence.
       *
       * This is the critical change:
       *
       * BEFORE:
       *   Claude -> label + detail + source
       *
       * NOW:
       *   Claude -> label + sourceIndex
       *   Tavily -> actual detail + source URL
       */
      const signals = buildSignals(
        synthesis,
        sources
      );

      /**
       * We require at least one real evidence-backed signal
       * before marking the research run complete.
       */
      if (signals.length === 0) {
        await prisma.researchRun.update({
          where: {
            id: run.id,
          },
          data: {
            status: "FAILED",
            error:
              "No sufficiently grounded research signals were found.",
            completedAt: new Date(),
          },
        });

        return {
          configured: true,
          error:
            "Reigna found public sources, but could not establish a sufficiently grounded research signal.",
        };
      }

      await prisma.researchRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: "COMPLETED",
          summary: synthesis.summary,
          completedAt: new Date(),
        },
      });

      await contactsService.updateResearch(
        ownerId,
        contactId,
        {
          researchSummary: synthesis.summary,
          researchSignals: signals,
          whyThisPerson: synthesis.whyThisPerson,
          recommendation: synthesis.recommendation,
        }
      );

      return {
        configured: true,
        summary: synthesis.summary,
        signals,
        whyThisPerson: synthesis.whyThisPerson,
        recommendation: synthesis.recommendation,
      };
    } catch (error) {
      const message =
        error instanceof ProviderError
          ? error.message
          : "Reigna couldn't complete the research pass.";

      await prisma.researchRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: "FAILED",
          error: message,
          completedAt: new Date(),
        },
      });

      return {
        configured: true,
        error: message,
      };
    }
  }
}

export const researchService: ResearchService =
  new TavilyResearchService();