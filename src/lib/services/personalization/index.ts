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

export interface PersonalizationService {
  isConfigured(): boolean;
  generateDraft(
    input: PersonalizationInput
  ): Promise<PersonalizationOutcome>;
}

/**
 * Claude must return only the email itself and identify which
 * research signal it used.
 *
 * We deliberately do not allow Claude to generate the research
 * evidence. The evidence comes from our database/Tavily pipeline.
 */
const DraftSchema = z.object({
  subjectVariants: z
    .array(z.string().min(1))
    .min(2)
    .max(3),

  body: z
    .string()
    .min(20),

  usedSignalIndex: z
    .number()
    .int()
    .min(0),
});

const AuditSchema = z.object({
  approved: z.boolean(),

  issues: z
    .array(z.string())
    .max(8),
});

/**
 * Phrases that make Reigna sound generic, overly promotional,
 * or like obvious AI-generated outbound.
 */
const BANNED_PHRASES = [
  "hope this email finds you well",
  "just wanted to reach out",
  "i'd love to pick your brain",
  "pick your brain",
  "supercharge",
  "10x",
  "unlock",
  "revolutionize",
  "game-changing",
  "game changing",
  "synergy",
  "leverage",
  "seamless",
  "cutting-edge",
  "next-level",
  "transformative",
];

/**
 * Words/phrases that commonly cause Reigna to make unsupported
 * assumptions about the recipient.
 */
const UNSUPPORTED_INFERENCE_PHRASES = [
  "likely",
  "probably",
  "suggesting",
  "suggests that",
  "indicates that",
  "indicating that",
  "must be",
  "i imagine",
  "i imagine you",
  "i assume",
  "i'm sure",
  "i suspect",
  "you probably",
  "you likely",
  "you must",
  "your team probably",
  "your team likely",
  "i'd imagine",
  "i would imagine",
  "i can imagine",
  "i'm guessing",
  "i guess",
];

/**
 * Claims about workflows/problems that should never be invented
 * unless the actual research explicitly establishes them.
 */
const UNSUPPORTED_WORKFLOW_PHRASES = [
  "manually tracking",
  "manual tracking",
  "jumping between platforms",
  "scattered signals",
  "scattered data",
  "spreadsheet",
  "spreadsheets",
  "tracking speakers",
  "speaker availability",
  "sponsor commitments",
  "member engagement",
  "event coordination",
  "event outreach",
  "outreach process",
  "outreach workflow",
  "your current process",
  "your existing process",
  "your current workflow",
  "your existing workflow",
  "your team spends",
  "your team is spending",
  "takes hours",
  "takes a lot of time",
  "time-consuming",
  "bottleneck",
  "pain point",
  "challenge",
  "struggle",
  "problem",
];

function containsBannedPhrase(
  text: string
): boolean {
  const lower = text.toLowerCase();

  return BANNED_PHRASES.some((phrase) =>
    lower.includes(phrase)
  );
}

function containsUnsupportedInference(
  text: string
): boolean {
  const lower = text.toLowerCase();

  return UNSUPPORTED_INFERENCE_PHRASES.some(
    (phrase) => lower.includes(phrase)
  );
}

function containsUnsupportedWorkflowClaim(
  text: string
): boolean {
  const lower = text.toLowerCase();

  return UNSUPPORTED_WORKFLOW_PHRASES.some(
    (phrase) => lower.includes(phrase)
  );
}

function normalizeText(
  text: string
): string {
  return text
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * We do not want the AI to turn raw evidence into a business
 * conclusion.
 *
 * This lightweight local check catches the most obvious failures
 * before the email even reaches the evidence audit.
 */
function localDraftCheck(
  body: string
): string[] {
  const issues: string[] = [];

  if (containsBannedPhrase(body)) {
    issues.push(
      "The email contains a banned or generic outbound phrase."
    );
  }

  if (containsUnsupportedInference(body)) {
    issues.push(
      "The email contains an unsupported inference about the recipient."
    );
  }

  if (containsUnsupportedWorkflowClaim(body)) {
    issues.push(
      "The email invents a workflow, pain point, responsibility, or operational problem."
    );
  }

  return issues;
}

/**
 * Ask Claude to write the email using ONE specific evidence item.
 *
 * Important:
 *
 * - The research summary is intentionally NOT supplied.
 * - Other research signals are intentionally NOT supplied.
 * - Claude sees only ONE selected factual signal.
 *
 * This prevents the model from combining unrelated evidence and
 * inventing a narrative.
 */
async function generateDraftWithEvidence(
  input: PersonalizationInput,
  signalIndex: number
): Promise<z.infer<typeof DraftSchema> | null> {
  const signal =
    input.researchSignals[signalIndex];

  if (!signal) {
    return null;
  }

  const evidence = normalizeText(
    signal.detail
  );

  const system =
    "You write concise first-touch B2B outbound emails for Reigna. " +
    "Your job is to write a natural email based on ONE supplied factual research signal. " +
    "The supplied signal is the only recipient-specific evidence you may use. " +
    "Do not use any information from your general knowledge. " +
    "Do not invent facts. " +
    "Do not infer the recipient's problems, responsibilities, intentions, priorities, workflows, " +
    "buying plans, team structure, internal processes, or business needs. " +
    "Do not turn an observation into a conclusion. " +
    "Do not use words such as likely, probably, suggesting, indicates, assume, imagine, or guess " +
    "to connect the evidence to an unsupported conclusion. " +
    "You may mention exactly what the supplied evidence says. " +
    "You may then ask a genuine question about whether the topic is relevant to the recipient. " +
    "Keep the email concise and human. " +
    "Do not explain Reigna at excessive length. " +
    "Do not use hype or growth-hacker language. " +
    "Do not claim that Reigna solves a problem unless that problem is explicitly established by the recipient evidence. " +
    "The email must sound like a person who noticed something specific and is asking a reasonable question. " +
    "Return JSON only in this exact format: " +
    '{"subjectVariants":["subject 1","subject 2"],"body":"email body","usedSignalIndex":' +
    String(signalIndex) +
    "}";

  const userPrompt =
    `Recipient: ${input.contactName}\n` +
    `Title: ${input.contactTitle}\n` +
    `Company: ${input.company}\n\n` +
    `ONE VERIFIED RESEARCH SIGNAL:\n` +
    `Label: ${signal.label}\n` +
    `Evidence: ${evidence}\n` +
    `Source: ${signal.source}\n\n` +
    "EMAIL RULES:\n" +
    "1. Address the recipient naturally.\n" +
    "2. Mention one concrete fact from the supplied evidence.\n" +
    "3. Do not add a second recipient-specific fact.\n" +
    "4. Do not infer what the recipient thinks, wants, needs, or does internally.\n" +
    "5. Do not invent a workflow or pain point.\n" +
    "6. Do not claim the recipient uses a particular tool or process unless the evidence explicitly says so.\n" +
    "7. Do not claim the recipient is looking for a solution.\n" +
    "8. End with a low-pressure question.\n" +
    "9. Keep it around 80–130 words.\n" +
    "10. No generic greeting.\n" +
    "11. No fake familiarity.\n" +
    "12. No exaggerated compliments.\n" +
    "13. Do not mention information from any other research signal.\n" +
    (input.voiceGuidance
      ? `14. Follow this sender voice guidance: ${input.voiceGuidance}\n`
      : "");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw =
        await anthropicProvider.completeJson(
          system,
          userPrompt,
          1200
        );

      const parsed =
        DraftSchema.safeParse(raw);

      if (!parsed.success) {
        continue;
      }

      if (
        parsed.data.usedSignalIndex !==
        signalIndex
      ) {
        continue;
      }

      const localIssues =
        localDraftCheck(
          parsed.data.body
        );

      if (localIssues.length > 0) {
        continue;
      }

      return parsed.data;
    } catch {
      // Retry once.
    }
  }

  return null;
}

/**
 * Second-pass evidence audit.
 *
 * The auditor receives:
 *
 * - the exact source evidence
 * - the generated email
 *
 * It must determine whether every recipient-specific claim
 * actually follows from that evidence.
 */
async function auditDraft(
  body: string,
  signal: {
    label: string;
    detail: string;
    source: string;
  }
): Promise<{
  approved: boolean;
  issues: string[];
  completed: boolean;
}> {
  const system =
    "You are Reigna's evidence auditor. " +
    "Your only job is to determine whether a proposed outbound email stays grounded in the supplied evidence. " +
    "Be extremely strict. " +
    "A recipient-specific claim is allowed only if it is explicitly supported by the evidence. " +
    "Do not give the email credit for claims that merely sound reasonable. " +
    "Do not treat job titles, geography, company size, industry, or general knowledge as evidence. " +
    "Do not allow inferred responsibilities. " +
    "Do not allow inferred workflows. " +
    "Do not allow inferred pain points. " +
    "Do not allow inferred buying intent. " +
    "Do not allow inferred internal processes. " +
    "Do not allow claims about what the recipient's team does unless the evidence explicitly says so. " +
    "The email is allowed to describe Reigna itself in general terms. " +
    "The email is allowed to ask a question. " +
    "Return JSON only: " +
    '{"approved": boolean, "issues": string[]}';

  const userPrompt =
    `VERIFIED EVIDENCE:\n` +
    `Label: ${signal.label}\n` +
    `Evidence: ${signal.detail}\n` +
    `Source: ${signal.source}\n\n` +
    `PROPOSED EMAIL:\n${body}\n\n` +
    "Audit every recipient-specific factual statement in the proposed email. " +
    "If the email says or implies something about the recipient that is not directly established by the evidence, reject it. " +
    "If the email is grounded in the evidence and only asks a reasonable question, approve it.";

  try {
    const raw =
      await anthropicProvider.completeJson(
        system,
        userPrompt,
        900
      );

    const parsed =
      AuditSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        approved: false,
        issues: [
          "The evidence audit returned an invalid response.",
        ],
        completed: false,
      };
    }

    return {
      approved: parsed.data.approved,
      issues: parsed.data.issues,
      completed: true,
    };
  } catch {
    return {
      approved: false,
      issues: [
        "The evidence audit could not be completed.",
      ],
      completed: false,
    };
  }
}

/**
 * Choose signals in a deterministic order.
 *
 * We still let Claude write the email, but we don't let Claude
 * freely choose a random signal every time.
 *
 * Research signals already came from our evidence pipeline, so
 * each one is valid. We simply try them one by one until we get
 * a draft that survives the audit.
 */
function getSignalOrder(
  signals: PersonalizationInput["researchSignals"]
): number[] {
  return signals
    .map((signal, index) => ({
      index,
      label: signal.label.toLowerCase(),
      detail: signal.detail.toLowerCase(),
    }))
    .sort((a, b) => {
      const scoreA =
        (a.detail.length > 80 ? 2 : 0) +
        (a.label.length > 0 ? 1 : 0);

      const scoreB =
        (b.detail.length > 80 ? 2 : 0) +
        (b.label.length > 0 ? 1 : 0);

      return scoreB - scoreA;
    })
    .map((item) => item.index);
}

class ClaudePersonalizationService
  implements PersonalizationService
{
  isConfigured(): boolean {
    return anthropicProvider.isConfigured();
  }

  async generateDraft(
    input: PersonalizationInput
  ): Promise<PersonalizationOutcome> {
    if (!this.isConfigured()) {
      return {
        configured: false,
      };
    }

    if (
      !input.researchSignals ||
      input.researchSignals.length === 0
    ) {
      return {
        configured: true,
        error:
          "Reigna hasn't gathered research yet — run research before drafting.",
      };
    }

    /**
     * We intentionally ignore the research summary when writing
     * the email. The selected raw signal is the source of truth.
     */
    const signalOrder =
      getSignalOrder(
        input.researchSignals
      );

    let lastIssues: string[] = [];

    for (
      const signalIndex of signalOrder
    ) {
      const signal =
        input.researchSignals[
          signalIndex
        ];

      if (!signal) {
        continue;
      }

      /**
       * Try generating a draft from this one piece of evidence.
       */
      const draft =
        await generateDraftWithEvidence(
          input,
          signalIndex
        );

      if (!draft) {
        lastIssues = [
          "The draft did not satisfy Reigna's evidence-grounding rules.",
        ];

        continue;
      }

      /**
       * Local safety check again before the expensive audit.
       */
      const localIssues =
        localDraftCheck(
          draft.body
        );

      if (localIssues.length > 0) {
        lastIssues =
          localIssues;

        continue;
      }

      /**
       * Evidence audit.
       */
      const audit =
        await auditDraft(
          draft.body,
          signal
        );

      /**
       * If the audit service itself failed, retry the same
       * signal rather than immediately destroying the draft.
       */
      if (!audit.completed) {
        lastIssues =
          audit.issues;

        /**
         * Give the audit another attempt.
         */
        const retryAudit =
          await auditDraft(
            draft.body,
            signal
          );

        if (!retryAudit.completed) {
          lastIssues =
            retryAudit.issues;

          continue;
        }

        if (!retryAudit.approved) {
          lastIssues =
            retryAudit.issues;

          continue;
        }
      } else if (!audit.approved) {
        lastIssues =
          audit.issues;

        continue;
      }

      /**
       * Only now is the draft allowed through.
       *
       * The research basis is constructed entirely from our
       * original evidence object — never from Claude.
       */
      return {
        configured: true,
        subject:
          draft.subjectVariants[0],
        subjectVariants:
          draft.subjectVariants,
        body: draft.body,
        researchBasis:
          `${signal.detail} (Source: ${signal.source})`,
      };
    }

    console.warn(
      "[personalization] All grounded draft attempts failed",
      {
        contact: input.contactName,
        company: input.company,
        issues: lastIssues,
      }
    );

    return {
      configured: true,
      error:
        "Reigna couldn't produce a sufficiently evidence-grounded draft yet.",
    };
  }
}

export const personalizationService: PersonalizationService =
  new ClaudePersonalizationService();