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
  const signal = input.researchSignals[signalIndex];

  if (!signal) {
    return null;
  }

  const evidence = normalizeText(signal.detail);

  const system = [
    "You write concise first-touch B2B outbound emails for Reigna.",
    "Write a natural email using ONE supplied factual research signal.",
    "The supplied signal is the only recipient-specific evidence you may use.",
    "Do not use general knowledge as evidence.",
    "Do not invent facts.",
    "Do not infer the recipient's problems, responsibilities, intentions, priorities, workflows, buying plans, team structure, internal processes, or business needs.",
    "Do not turn an observation into a conclusion.",
    "Do not interpret what the evidence means about the recipient.",
    "Do not say or imply that a fact informs, shapes, reflects, demonstrates, signals, suggests, indicates, or reveals how the recipient thinks, works, leads, decides, or operates unless the evidence explicitly says so.",
    "Do not use likely, probably, suggesting, indicates, assume, imagine, guess, reflects, informs, demonstrates, or reveals to connect evidence to an unsupported conclusion.",
    "The recipient title is metadata only. It is not evidence of responsibilities, team ownership, priorities, workflows, or problems.",
    "The company name is metadata only. It is not evidence of company activity unless the supplied signal explicitly states that activity.",
    "Do not claim that Reigna solves a problem unless that problem is explicitly established by the evidence.",
    "Do not ask questions that assume the recipient owns, manages, encounters, or is responsible for the subject in the evidence.",
    "Do not ask whether the subject is handled by another person or team.",
    "Do not refer to the recipient's role, responsibilities, team, workflow, or internal process unless the evidence explicitly establishes it.",
    "The final question may ask only whether the topic or type of research is relevant to the company or team.",
    "Keep the email concise and human.",
    "Do not use hype or exaggerated compliments.",
    "Return JSON only in this exact format: " +
      '{"subjectVariants":["subject 1","subject 2"],"body":"email body","usedSignalIndex":' +
      String(signalIndex) +
      "}",
  ].join(" ");

  const userPrompt = [
    `Recipient: ${input.contactName}`,
    `Title: ${input.contactTitle}`,
    `Company: ${input.company}`,
    "",
    "ONE VERIFIED RESEARCH SIGNAL:",
    `Label: ${signal.label}`,
    `Evidence: ${evidence}`,
    `Source: ${signal.source}`,
    "",
    "EMAIL RULES:",
    "1. Address the recipient naturally.",
    "2. Mention one concrete fact from the supplied evidence.",
    "3. Do not add another recipient-specific fact.",
    "4. Treat the title and company name as metadata, not evidence.",
    "5. State the research observation plainly; do not interpret what it means about the recipient.",
    "6. Do not invent a workflow, pain point, hiring activity, team structure, responsibility, or buying intent.",
    "7. Do not claim the recipient uses a particular tool or process unless the evidence explicitly says so.",
    "8. Do not claim the recipient is looking for a solution.",
    "9. Do not ask who owns, handles, manages, or is responsible for the subject.",
    "10. End with a low-pressure question about whether the topic is relevant at the company.",
    "11. Keep it around 80–130 words.",
    "12. No generic greeting.",
    "13. No fake familiarity.",
    "14. No exaggerated compliments.",
    "15. Do not mention information from any other research signal.",
    input.voiceGuidance
      ? `16. Follow this sender voice guidance: ${input.voiceGuidance}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await anthropicProvider.completeJson(
      system,
      userPrompt,
      1200,
      { timeoutMs: 8_000, maxRetries: 0 }
    );

    const parsed = DraftSchema.safeParse(raw);

    if (!parsed.success) {
      return null;
    }

    if (parsed.data.usedSignalIndex !== signalIndex) {
      return null;
    }

    const localIssues = localDraftCheck(parsed.data.body);

    if (localIssues.length > 0) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

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
        900,
        { timeoutMs: 8_000, maxRetries: 0 }
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

function buildGroundedFallbackDraft(
  input: PersonalizationInput,
  signalIndex: number
): z.infer<typeof DraftSchema> | null {
  const signal =
    input.researchSignals[signalIndex];

  if (!signal) {
    return null;
  }

  const evidence =
    normalizeText(signal.detail)
      .replace(/\\s+/g, " ")
      .trim();

  if (!evidence) {
    return null;
  }

  const recipientName =
    input.contactName
      .trim()
      .split(/\\s+/)[0] || "there";

  const company =
    input.company.trim();

  const label =
    normalizeText(signal.label)
      .replace(/\\s+/g, " ")
      .trim();

  const subject =
    label
      ? `${label} at ${company}`
      : `A note about ${company}`;

  const body =
    `${recipientName},\\n\\n` +
    `I came across this while researching ${company}: ${evidence}\\n\\n` +
    `Reigna helps teams identify prospects using verified research signals and turn that research into targeted outbound.\\n\\n` +
    `Would this kind of research be relevant at ${company}?`;

  return {
    subjectVariants: [
      subject,
      `Research on ${company}`,
    ],
    body,
    usedSignalIndex: signalIndex,
  };
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
     * Use the strongest deterministic evidence signal only.
     *
     * We intentionally do not cycle through every signal. That keeps
     * interactive regeneration bounded and prevents a rejected draft
     * from turning into a long chain of AI calls.
     */
    const signalOrder =
      getSignalOrder(
        input.researchSignals
      );

    const signalIndex =
      signalOrder[0];

    const signal =
      input.researchSignals[
        signalIndex
      ];

    if (!signal) {
      return {
        configured: true,
        error:
          "Reigna couldn't select a valid research signal for this contact.",
      };
    }

    /**
     * First generation attempt.
     */
    const draft =
      await generateDraftWithEvidence(
        input,
        signalIndex
      );

    if (!draft) {
      return {
        configured: true,
        error:
          "Reigna couldn't produce a sufficiently evidence-grounded draft yet.",
      };
    }

    /**
     * Local safety check before the evidence audit.
     */
    const localIssues =
      localDraftCheck(
        draft.body
      );

    if (localIssues.length > 0) {
      return {
        configured: true,
        error:
          "Reigna couldn't produce a sufficiently evidence-grounded draft yet.",
      };
    }

    /**
     * Evidence audit.
     */
    const audit =
      await auditDraft(
        draft.body,
        signal
      );

    if (!audit.completed) {
      console.warn(
        "[personalization] Evidence audit could not be completed",
        {
          contact: input.contactName,
          company: input.company,
          issues: audit.issues,
        }
      );

      return {
        configured: true,
        error:
          "Reigna couldn't complete the evidence audit. Please try regenerating again.",
      };
    }

    /**
     * If Claude's draft is rejected, do not ask Claude to reinterpret
     * the evidence again. Use a deterministic fallback built directly
     * from the verified research signal.
     *
     * This guarantees that Reigna never invents recipient roles,
     * responsibilities, workflows, hiring activity, or team structure
     * simply to make the email sound conversational.
     */
    if (!audit.approved) {
      const fallbackDraft =
        buildGroundedFallbackDraft(
          input,
          signalIndex
        );

      if (!fallbackDraft) {
        console.warn(
          "[personalization] Grounded fallback could not be created",
          {
            contact: input.contactName,
            company: input.company,
            issues: audit.issues,
          }
        );

        return {
          configured: true,
          error:
            "Reigna couldn't produce a sufficiently evidence-grounded draft yet.",
        };
      }

      const fallbackIssues =
        localDraftCheck(
          fallbackDraft.body
        );

      if (fallbackIssues.length > 0) {
        console.warn(
          "[personalization] Grounded fallback failed local validation",
          {
            contact: input.contactName,
            company: input.company,
            issues: fallbackIssues,
          }
        );

        return {
          configured: true,
          error:
            "Reigna couldn't produce a sufficiently evidence-grounded draft yet.",
        };
      }

      return {
        configured: true,
        subject:
          fallbackDraft.subjectVariants[0],
        subjectVariants:
          fallbackDraft.subjectVariants,
        body: fallbackDraft.body,
        researchBasis:
          `${signal.detail} (Source: ${signal.source})`,
      };
    }

    /**
     * The original draft passed both local and evidence checks.
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
}

export const personalizationService: PersonalizationService =
  new ClaudePersonalizationService();