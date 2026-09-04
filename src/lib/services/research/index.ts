import { z } from "zod";
import type { ResearchSignal } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { tavilyProvider, type TavilySearchResult } from "@/lib/providers/tavily";
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
 * Research service boundary — gathers real public business signals (via
 * Tavily) for a contact's company and decision-maker, then asks Claude to
 * synthesize (never invent) findings into a concise summary. Every
 * `ResearchSignal.source` is guaranteed to be a URL Tavily actually
 * returned — the synthesis step is validated against the raw source list
 * and any signal citing a URL we didn't gather is dropped rather than
 * trusted (see /docs/PRODUCT_DECISIONS.md — research pipeline).
 */
export interface ResearchService {
  isConfigured(): boolean;
  researchContact(ownerId: string, contactId: string): Promise<ResearchOutcome>;
}

const SynthesisSchema = z.object({
  summary: z.string().min(1),
  whyThisPerson: z.string().min(1),
  recommendation: z.string().min(1),
  signals: z.array(
    z.object({
      label: z.string().min(1),
      detail: z.string().min(1),
      sourceIndex: z.number().int().min(0),
    })
  ),
});

function dedupeByUrl(results: TavilySearchResult[]): TavilySearchResult[] {
  const seen = new Set<string>();
  const out: TavilySearchResult[] = [];
  for (const result of results) {
    if (seen.has(result.url)) continue;
    seen.add(result.url);
    out.push(result);
  }
  return out;
}

async function synthesize(
  company: string,
  domain: string | undefined,
  personName: string,
  title: string,
  sources: TavilySearchResult[]
): Promise<z.infer<typeof SynthesisSchema> | null> {
  const system =
  "You synthesize real web research evidence for a B2B outbound sales tool. " +
  "You are NOT allowed to invent facts — use only the supplied evidence. " +
  "Every signal you produce must cite the index of the source it came from. " +
  "Respond with JSON only, matching this exact shape: " +
  '{"summary": string, "whyThisPerson": string, "recommendation": string, ' +
  '"signals": [{"label": string, "detail": string, "sourceIndex": number}]}. ' +
  "If the evidence is too thin to say something specific and true, return fewer signals rather than inventing one. " +
  "Return no more than 6 signals.";

  const evidenceList = sources
    .map((s, i) => `[${i}] ${s.title}\nURL: ${s.url}\n${s.snippet.slice(0, 500)}`)
    .join("\n\n");

  const userPrompt = `Company: ${company}\nDomain: ${domain ?? "unknown"}\nDecision-maker: ${personName} (${title})\n\nEvidence:\n${evidenceList}`;

 let lastError: unknown;

for (let attempt = 0; attempt < 2; attempt++) {
  try {
    console.log("[Research] Anthropic synthesis attempt:", attempt + 1);

    const raw = await anthropicProvider.completeJson(system, userPrompt);

    console.log("[Research] Anthropic synthesis response received");

    const parsed = SynthesisSchema.safeParse(raw);

    if (parsed.success) {
      console.log("[Research] Anthropic synthesis succeeded");
      return parsed.data;
    }

    console.error("[Research] Anthropic response failed schema validation:", parsed.error);
  } catch (error) {
    console.error("[Research] Anthropic synthesis failed:", error);
  }
}

if (lastError instanceof ProviderError) {
  throw lastError;
}

throw new Error(
  lastError instanceof Error
    ? lastError.message
    : "Anthropic research synthesis failed."
);
}

class TavilyResearchService implements ResearchService {
  isConfigured(): boolean {
    return tavilyProvider.isConfigured() && anthropicProvider.isConfigured();
  }

  async researchContact(ownerId: string, contactId: string): Promise<ResearchOutcome> {
    if (!this.isConfigured()) return { configured: false };
    if (!isDatabaseConfigured || !prisma) return { configured: true, error: "No database connection." };

    const contact = await contactsService.getById(ownerId, contactId);
    if (!contact) return { configured: true, error: "Contact not found." };

    const run = await prisma.researchRun.create({ data: { contactId, status: "PENDING" } });

    try {
      const [domainResults, companyResults, personResults, signalResults] = await Promise.all([
        contact.companyDomain ? tavilyProvider.researchDomain(contact.companyDomain) : Promise.resolve([]),
        tavilyProvider.researchCompanyName(contact.company),
        tavilyProvider.researchPerson(contact.name, contact.company),
        tavilyProvider.researchBusinessSignals(contact.company),
      ]);

      const sources = dedupeByUrl([...domainResults, ...companyResults, ...personResults, ...signalResults]);

      if (sources.length === 0) {
        await prisma.researchRun.update({
          where: { id: run.id },
          data: { status: "FAILED", error: "No public research evidence found.", completedAt: new Date() },
        });
        return { configured: true, error: "Reigna couldn't find any public evidence for this contact yet." };
      }

      await prisma.researchSource.createMany({
        data: sources.map((s) => ({
          researchRunId: run.id,
          url: s.url,
          title: s.title,
          snippet: s.snippet,
          publishedAt: s.publishedAt ? new Date(s.publishedAt) : undefined,
        })),
      });

      const synthesis = await synthesize(contact.company, contact.companyDomain, contact.name, contact.title, sources);
      if (!synthesis) {
        await prisma.researchRun.update({
          where: { id: run.id },
          data: { status: "FAILED", error: "AI synthesis failed.", completedAt: new Date() },
        });
        return { configured: true, error: "Reigna couldn't complete the research pass." };
      }

      const signals: ResearchSignal[] = synthesis.signals
        .filter((s) => s.sourceIndex >= 0 && s.sourceIndex < sources.length)
        .slice(0, 6)
        .map((s) => ({ label: s.label, detail: s.detail, source: sources[s.sourceIndex].url }));

      await prisma.researchRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", summary: synthesis.summary, completedAt: new Date() },
      });

      await contactsService.updateResearch(ownerId, contactId, {
        researchSummary: synthesis.summary,
        researchSignals: signals,
        whyThisPerson: synthesis.whyThisPerson,
        recommendation: synthesis.recommendation,
      });

      return {
        configured: true,
        summary: synthesis.summary,
        signals,
        whyThisPerson: synthesis.whyThisPerson,
        recommendation: synthesis.recommendation,
      };
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Reigna couldn't complete the research pass.";
      await prisma.researchRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      return { configured: true, error: message };
    }
  }
}

export const researchService: ResearchService = new TavilyResearchService();

