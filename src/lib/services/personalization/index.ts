import { z } from "zod";
import { anthropicProvider } from "@/lib/providers/anthropic";

export interface PersonalizationInput {
  contactName: string;
  contactTitle: string;
  company: string;
  researchSummary: string;
  researchSignals: {
    label: string;
    detail: string;
    source: string;
  }[];
  voiceGuidance?: string;
}

export interface PersonalizationOutcome {
  configured: boolean;
  subject?: string;
  subjectVariants?: string[];
  body?: string;
  researchBasis?: string;
  error?: string;
}

/**
 * Personalization service boundary.
 *
 * Generates a genuinely distinct subject + email body for a contact,
 * grounded in real research findings.
 *
 * Claude is instructed to select exactly one supplied research signal.
 * The researchBasis returned to the UI is constructed on our side from
 * the original research signal rather than trusted from AI-generated text.
 */
export interface PersonalizationService {
  isConfigured(): boolean;
  generateDraft(
    input: PersonalizationInput
  ): Promise<PersonalizationOutcome>;
}

const DraftSchema = z.object({
  subjectVariants: z.array(z.string().min(1)).min(2).max(3),
  body: z.string().min(20),
  usedSignalIndex: z.number().int().min(0),
});

const AuditSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()).max(6),
});

const BANNED_PHRASES = [
  "hope this email finds you well",
  "just wanted to reach out",
  "i'd love to pick your brain",
  "supercharge",
  "10x",
  "unlock",
  "revolutionize",
  "game-changing",
  "game changing",
];

function containsBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();

  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Converts research fragments into natural language before Claude sees them.
 *
 * The research data itself remains unchanged in the database.
 * This only creates a safer presentation of the evidence for the model.
 *
 * Example:
 *
 * "Organizer of Google Developer Group Lagos and recognized as..."
 *
 * becomes:
 *
 * "You organize Google Developer Group Lagos and were recognized as..."
 */
function normalizeResearchSignal(
  signal: {
    label: string;
    detail: string;
    source: string;
  },
  contactName: string
): string {
  let detail = signal.detail.trim();

  // Specific normalization for the research pattern currently
  // appearing in Reigna's research data.
  detail = detail.replace(
    /^Organizer of Google Developer Group Lagos and recognized as\b/i,
    "You organize Google Developer Group Lagos and were recognized as"
  );

  detail = detail.replace(
    /^Organizer of Google Developer Group Lagos\b/i,
    "You organize Google Developer Group Lagos"
  );

  // Generic "Organizer of..." normalization.
  detail = detail.replace(
    /^Organizer of (.+?)(?:\s+and\s+recognized as\s+(.+))?$/i,
    (_, group: string, recognition?: string) => {
      if (recognition) {
        return `You organize ${group.trim()} and were recognized as ${recognition.trim()}`;
      }

      return `You organize ${group.trim()}`;
    }
  );

  // Normalize common biography fragments.
  detail = detail.replace(
    /^Has served as (.+)$/i,
    "You have served as $1"
  );

  detail = detail.replace(
    /^Has gained (.+)$/i,
    "You have gained $1"
  );

  detail = detail.replace(
    /^Has worked as (.+)$/i,
    "You have worked as $1"
  );

  detail = detail.replace(
    /^Currently serves as (.+)$/i,
    "You currently serve as $1"
  );

  detail = detail.replace(
    /^Currently works as (.+)$/i,
    "You currently work as $1"
  );

  // If the signal still begins with a fragment-like construction,
  // explicitly identify it as evidence rather than encouraging Claude
  // to treat the fragment as a complete sentence.
  if (
    /^organizer of\b/i.test(detail) ||
    /^has served\b/i.test(detail) ||
    /^has gained\b/i.test(detail) ||
    /^has worked\b/i.test(detail)
  ) {
    return `${contactName}: ${detail}`;
  }

  return detail;
}

class ClaudePersonalizationService implements PersonalizationService {
  isConfigured(): boolean {
    return anthropicProvider.isConfigured();
  }

  private async auditDraft(
    input: PersonalizationInput,
    draft: {
      subjectVariants: string[];
      body: string;
      usedSignalIndex: number;
    }
  ): Promise<z.infer<typeof AuditSchema> | null> {
    const signal = input.researchSignals[draft.usedSignalIndex];

    if (!signal) {
      return {
        approved: false,
        issues: ["The selected research signal does not exist."],
      };
    }

    /**
     * Give the auditor the same normalized evidence that the writer saw.
     * This prevents the writer and auditor from interpreting the research
     * differently.
     */
    const signalList = input.researchSignals
      .map(
        (researchSignal, index) =>
          `${index}: ${researchSignal.label} — ${normalizeResearchSignal(
            researchSignal,
            input.contactName
          )} (Source: ${researchSignal.source})`
      )
      .join("\n");

    const system =
      "You are the evidence auditor for Reigna, a research-driven B2B outbound platform. " +
      "Your job is to determine whether a generated cold email stays faithful to the supplied research. " +
      "Be extremely conservative. If a statement is not explicitly supported by the supplied research signal, " +
      "treat it as unsupported. Do not give the draft the benefit of the doubt. " +
      "Facts about a company, person, geography, technology, leadership, community activity, growth, expansion, " +
      "clients, priorities, problems, intentions, or buying needs must not be invented. " +
      "A product capability described as a capability of Reigna is allowed, but it must not be presented as a " +
      "problem the recipient definitely has unless the research explicitly establishes that problem. " +
      "Questions about possible problems are acceptable. Unsupported assertions are not. " +
      "The email must use exactly one research signal as its personalization anchor. " +
      "Do not penalize the email merely for describing Reigna's own capabilities. " +
      "Return JSON only in this exact shape: " +
      '{"approved": boolean, "issues": string[]}. ' +
      "Approve only when the email is sufficiently grounded in the supplied evidence.";

    const userPrompt =
      `Recipient: ${input.contactName}, ${input.contactTitle} at ${input.company}\n` +
      `Research summary: ${input.researchSummary}\n\n` +
      `Available research signals:\n${signalList}\n\n` +
      `Selected signal index: ${draft.usedSignalIndex}\n\n` +
      `DRAFT SUBJECTS:\n${draft.subjectVariants.join("\n")}\n\n` +
      `DRAFT EMAIL:\n${draft.body}\n\n` +
      "AUDIT RULES:\n" +
      "1. The email must use exactly one research signal as its anchor.\n" +
      "2. The anchor may be paraphrased naturally, but its factual meaning must remain unchanged.\n" +
      "3. Do not allow the email to invent responsibilities, workflows, challenges, scale, priorities, or needs.\n" +
      "4. Do not infer that organizing a community means the recipient handles speakers, sponsors, attendees, outreach, or member engagement unless the supplied signal explicitly says so.\n" +
      "5. Do not infer that operating in multiple countries means the company has coordination problems.\n" +
      "6. Do not infer buying intent from a job title, leadership position, geography, technology choice, community activity, growth, or tenure.\n" +
      "7. Questions about possible use cases are acceptable when they are genuinely framed as questions.\n" +
      "8. Reigna's product capabilities may be described as capabilities of Reigna.\n" +
      "9. Do not require the prospect to have a verified problem before Reigna can be mentioned.\n" +
      "10. Reject only unsupported factual claims, not reasonable product positioning or clearly framed questions.\n" +
      "11. The email must not mention research sources or URLs.\n" +
      "12. Return JSON only.";

    try {
      const raw = await anthropicProvider.completeJson(
        system,
        userPrompt,
        700
      );

      const parsed = AuditSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          approved: false,
          issues: ["The evidence audit returned an invalid result."],
        };
      }

      return parsed.data;
    } catch {
      return {
        approved: false,
        issues: ["The evidence audit could not be completed."],
      };
    }
  }

  async generateDraft(
    input: PersonalizationInput
  ): Promise<PersonalizationOutcome> {
    if (!this.isConfigured()) {
      return {
        configured: false,
      };
    }

    if (input.researchSignals.length === 0) {
      return {
        configured: true,
        error:
          "Reigna hasn't gathered research yet — run research before drafting.",
      };
    }

    /**
     * Normalize the research before giving it to Claude.
     *
     * This is especially important for signals generated from scraped
     * biographies and social profiles, which are often noun fragments
     * rather than complete sentences.
     */
    const signalList = input.researchSignals
      .map(
        (signal, index) =>
          `[${index}] ${signal.label}: ${normalizeResearchSignal(
            signal,
            input.contactName
          )} (source: ${signal.source})`
      )
      .join("\n");

    const system =
      "You write first-touch cold outbound emails for Reigna, an outbound intelligence platform. " +
      "Write concise, intelligent, human, specific, confident, respectful cold emails. " +
      "The email must feel researched, not templated. " +
      "CRITICAL EVIDENCE RULES: Use only facts explicitly present in the supplied research signals. " +
      "Do not turn a fact into an asserted problem, challenge, priority, intention, investment, expansion plan, " +
      "operational difficulty, or business need unless the research explicitly states it. " +
      "Do not infer that multiple offices mean coordination problems. " +
      "Do not infer that a person's title means they have a particular pain point. " +
      "Do not infer buying intent from company growth, geography, leadership tenure, technology choices, " +
      "community involvement, or other public activity. " +
      "Do not invent responsibilities from a person's role. " +
      "For example, knowing that someone organizes a developer community does not prove that they handle " +
      "speakers, sponsors, attendees, outreach, member engagement, or event logistics. " +
      "When a useful business implication is not explicitly supported, phrase it as a neutral observation or question. " +
      "Never fabricate facts, customer situations, projects, priorities, problems, or intentions. " +
      "Use exactly ONE research signal as the personalization anchor. " +
      "The opening should clearly connect to that signal without overstating what it means. " +
      "You may naturally paraphrase the supplied signal, but do not add facts to it. " +
      "Reigna's capabilities may be described as product capabilities, but never claim that the recipient currently " +
      "has a problem that Reigna solves unless the research explicitly establishes that problem. " +
      "The CTA should be low-pressure and relevant to the observation. " +
      "Do not ask questions that assume the recipient performs responsibilities that are not supported by research. " +
      "Never use: 'hope this email finds you well', 'just wanted to reach out', " +
      "'I'd love to pick your brain', 'supercharge', '10x', 'unlock', 'revolutionize', 'game-changing'. " +
      "Respond with JSON only: " +
      '{"subjectVariants": [2 or 3 short subject lines], "body": string, "usedSignalIndex": number}. ' +
      (input.voiceGuidance
        ? `Sender's voice/tone guidance: ${input.voiceGuidance}`
        : "");

    const userPrompt =
      `Recipient: ${input.contactName}, ${input.contactTitle} at ${input.company}\n` +
      `Research summary: ${input.researchSummary}\n\n` +
      `Available research signals:\n${signalList}\n\n` +
      "WRITING RULES:\n" +
      "1. Choose exactly one signal as the anchor.\n" +
      "2. Use only what that signal actually proves.\n" +
      "3. You may paraphrase the signal into natural language.\n" +
      "4. Do not add responsibilities, activities, problems, scale, intentions, priorities, or needs that are not explicitly supported.\n" +
      "5. Do not turn a person's title or community role into an assumed workflow.\n" +
      "6. If you connect the signal to a possible business concern, make it a genuine question rather than an assertion.\n" +
      "7. Describe Reigna's value separately from the prospect's verified facts.\n" +
      "8. Do not mention research sources or URLs inside the email body.\n" +
      "9. Keep the email short enough to feel like a real one-to-one message.\n" +
      "10. Do not use generic sales language.\n" +
      "11. End with a simple, low-pressure question or CTA.\n" +
      "12. Do not invent a signature; use 'Best,' only.";

    let auditFeedback = "";

    /**
     * Two attempts:
     *
     * Attempt 1 generates the draft.
     * Attempt 2 receives the auditor's exact objections and fixes them.
     */
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const attemptPrompt =
          userPrompt +
          (auditFeedback
            ? `\n\nThe previous draft failed the evidence audit.\n` +
              `Fix every issue below without introducing new unsupported claims:\n` +
              `${auditFeedback}`
            : "");

        const raw = await anthropicProvider.completeJson(
          system,
          attemptPrompt,
          1000
        );

        const parsed = DraftSchema.safeParse(raw);

        if (!parsed.success) {
          auditFeedback =
            "The response did not match the required JSON structure. " +
            "Return subjectVariants, body, and a valid usedSignalIndex.";
          continue;
        }

        const {
          subjectVariants,
          body,
          usedSignalIndex,
        } = parsed.data;

        /**
         * Basic deterministic quality checks before the evidence audit.
         */
        if (
          containsBannedPhrase(body) ||
          subjectVariants.some(containsBannedPhrase)
        ) {
          auditFeedback =
            "Remove banned or generic sales language and regenerate the email.";
          continue;
        }

        const signal = input.researchSignals[usedSignalIndex];

        if (!signal) {
          auditFeedback =
            "Choose exactly one valid research signal from the supplied evidence.";
          continue;
        }

        /**
         * Make sure the draft isn't empty or obviously malformed.
         */
        if (body.trim().length < 20) {
          auditFeedback =
            "The email body is too short. Write a complete concise email.";
          continue;
        }

        /**
         * Evidence audit.
         */
        const audit = await this.auditDraft(input, {
          subjectVariants,
          body,
          usedSignalIndex,
        });

        if (!audit || !audit.approved) {
          auditFeedback =
            audit?.issues.length
              ? audit.issues.map((issue) => `- ${issue}`).join("\n")
              : "The draft was not sufficiently grounded in the supplied evidence.";

          console.warn("[personalization] Evidence audit rejected draft:", {
            contact: input.contactName,
            company: input.company,
            usedSignalIndex,
            issues: audit?.issues ?? [],
          });

          continue;
        }

        /**
         * IMPORTANT:
         *
         * researchBasis comes from our original database research signal,
         * not from Claude's output.
         */
        return {
          configured: true,
          subject: subjectVariants[0],
          subjectVariants,
          body,
          researchBasis: `${signal.detail} (Source: ${signal.source})`,
        };
      } catch (error) {
        console.error("[personalization] Draft generation failed:", {
          contact: input.contactName,
          company: input.company,
          attempt: attempt + 1,
          error:
            error instanceof Error
              ? error.message
              : "Unknown personalization error.",
        });

        auditFeedback =
          "The draft could not be generated or validated. " +
          "Try again using only the supplied research evidence.";
      }
    }

    return {
      configured: true,
      error: "Reigna couldn't draft this message yet.",
    };
  }
}

export const personalizationService: PersonalizationService =
  new ClaudePersonalizationService();