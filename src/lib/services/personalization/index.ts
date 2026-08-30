import { z } from "zod";
import { anthropicProvider } from "@/lib/providers/anthropic";

export interface PersonalizationInput {
  contactName: string;
  contactTitle: string;
  company: string;
  researchSummary: string;
  researchSignals: { label: string; detail: string; source: string }[];
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
 * Personalization service boundary — writes a genuinely distinct subject +
 * email body for a contact, grounded in real research findings. Claude is
 * instructed to select exactly one supplied signal to base the email on;
 * `researchBasis` is then constructed on our side from that signal's real
 * `detail`/`source` rather than trusted from freeform AI text, so what the
 * UI calls "the research basis" is always literally true (see
 * /docs/PRODUCT_DECISIONS.md — AI personalization).
 */
export interface PersonalizationService {
  isConfigured(): boolean;
  generateDraft(input: PersonalizationInput): Promise<PersonalizationOutcome>;
}

const DraftSchema = z.object({
  subjectVariants: z.array(z.string().min(1)).min(2).max(3),
  body: z.string().min(20),
  usedSignalIndex: z.number().int().min(-1),
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

class ClaudePersonalizationService implements PersonalizationService {
  isConfigured(): boolean {
    return anthropicProvider.isConfigured();
  }

  async generateDraft(input: PersonalizationInput): Promise<PersonalizationOutcome> {
    if (!this.isConfigured()) return { configured: false };
    if (input.researchSignals.length === 0) {
      return { configured: true, error: "Reigna hasn't gathered research yet — run research before drafting." };
    }

    const system =
      "You write first-touch cold outbound emails for Reigna, an outbound intelligence platform. " +
      "Style: concise, intelligent, human, specific, confident, respectful, commercially aware. " +
      "Never generic-AI-SaaS. Never use: 'hope this email finds you well', 'just wanted to reach out', " +
      "'I'd love to pick your brain', 'supercharge', '10x', 'unlock', 'revolutionize', 'game-changing'. " +
      "Use ONLY the supplied research evidence — never invent facts. Pick exactly ONE signal (by its index) " +
      "that the email should be built around. Respond with JSON only: " +
      '{"subjectVariants": [2 or 3 short subject lines], "body": string, "usedSignalIndex": number}. ' +
      (input.voiceGuidance ? `Sender's voice/tone guidance: ${input.voiceGuidance}` : "");

    const signalList = input.researchSignals
      .map((s, i) => `[${i}] ${s.label}: ${s.detail} (source: ${s.source})`)
      .join("\n");

    const userPrompt =
      `Recipient: ${input.contactName}, ${input.contactTitle} at ${input.company}\n` +
      `Research summary: ${input.researchSummary}\n\nAvailable signals:\n${signalList}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await anthropicProvider.completeJson(system, userPrompt, 1000);
        const parsed = DraftSchema.safeParse(raw);
        if (!parsed.success) continue;

        const { subjectVariants, body, usedSignalIndex } = parsed.data;
        if (containsBannedPhrase(body) || subjectVariants.some(containsBannedPhrase)) continue;

        const signal = input.researchSignals[usedSignalIndex];
        if (!signal) continue;

        return {
          configured: true,
          subject: subjectVariants[0],
          subjectVariants,
          body,
          researchBasis: `${signal.detail} (Source: ${signal.source})`,
        };
      } catch {
        // retry once
      }
    }

    return { configured: true, error: "Reigna couldn't draft this message yet." };
  }
}

export const personalizationService: PersonalizationService = new ClaudePersonalizationService();

