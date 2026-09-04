import { fetchJson, ProviderError } from "@/lib/providers/http";

/**
 * Instantly — sending execution infrastructure (API v2 only, never v1).
 *
 * Instantly owns: mailbox OAuth connection, warm-up, deliverability
 * signals from its own account monitoring, and outbound sequence
 * execution. Reigna's own database remains the product's source of truth
 * for campaign/contact state — this module only talks to the wire format
 * Instantly expects and normalizes what it returns.
 *
 * The API key is read from `INSTANTLY_API_KEY` and must never be sent to
 * the browser. Client code only ever receives an OAuth authorization URL
 * and an opaque session id.
 */

const BASE_URL = "https://api.instantly.ai";

export type InstantlyMailboxProvider = "google" | "microsoft";

export interface InstantlyOAuthInit {
  sessionId: string;
  authorizationUrl: string;
}

export type InstantlyOAuthSessionState =
  | "pending"
  | "connected"
  | "failed";

export interface InstantlyOAuthSessionStatus {
  state: InstantlyOAuthSessionState;
  email?: string;
  message?: string;
}

export interface InstantlyAccount {
  email: string;
  warmupEnabled: boolean;
  warmupScore: number | null;
  dailyLimit: number;
  status: string;
  statusMessage: string | null;
  bounceRate: number | null;
  domain: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.INSTANTLY_API_KEY);
}

function authHeaders(): Record<string, string> {
  const key = process.env.INSTANTLY_API_KEY;

  if (!key) {
    throw new ProviderError(
      "instantly",
      "Instantly is not configured."
    );
  }

  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export const instantlyProvider = {
  isConfigured,

  /**
   * Starts a mailbox OAuth connection flow brokered entirely by Instantly.
   */
  async initOAuth(
    provider: InstantlyMailboxProvider,
    redirectUrl: string
  ): Promise<InstantlyOAuthInit> {
    const data = await fetchJson<{
      session_id: string;
      auth_url: string;
      expires_at?: string;
    }>(
      `${BASE_URL}/api/v2/oauth/${provider}/init`,
      {
        provider: "instantly",
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          redirect_url: redirectUrl,
        }),
        timeoutMs: 15_000,
      }
    );

    return {
      sessionId: data.session_id,
      authorizationUrl: data.auth_url,
    };
  },

  /**
   * Polls the state of a previously-started OAuth session.
   */
  async getOAuthSessionStatus(
    sessionId: string
  ): Promise<InstantlyOAuthSessionStatus> {
    const data = await fetchJson<{
      status: string;
      email?: string;
      message?: string;
    }>(
      `${BASE_URL}/api/v2/oauth/session/status/${encodeURIComponent(
        sessionId
      )}`,
      {
        provider: "instantly",
        headers: authHeaders(),
        timeoutMs: 15_000,
      }
    );

    const state: InstantlyOAuthSessionState =
      data.status === "connected"
        ? "connected"
        : data.status === "failed"
          ? "failed"
          : "pending";

    return {
      state,
      email: data.email,
      message: data.message,
    };
  },

  /**
   * Lists mailbox accounts connected to the Instantly workspace.
   *
   * Instantly may return account status as either a string or a numeric
   * value. Reigna normalizes that value to a string before it reaches
   * the rest of the application/database.
   */
  async listAccounts(): Promise<InstantlyAccount[]> {
    const data = await fetchJson<{
      items: {
        email: string;
        warmup_enabled?: boolean;
        warmup_score?: number | null;
        daily_limit?: number;
        status?: string | number | null;
        status_message?: string | null;
        bounce_rate?: number | null;
        domain?: string;
      }[];
    }>(`${BASE_URL}/api/v2/accounts`, {
      provider: "instantly",
      headers: authHeaders(),
      timeoutMs: 15_000,
    });

    return (data.items ?? []).map((row) => ({
      email: row.email,

      warmupEnabled: row.warmup_enabled ?? false,

      warmupScore: row.warmup_score ?? null,

      dailyLimit: row.daily_limit ?? 30,

      status:
        typeof row.status === "number"
          ? row.status === 1
            ? "active"
            : String(row.status)
          : row.status ?? "unknown",

      statusMessage: row.status_message ?? null,

      bounceRate: row.bounce_rate ?? null,

      domain:
        row.domain ??
        row.email.split("@")[1] ??
        "",
    }));
  },

  /**
   * Fetches health/warm-up detail for a single connected mailbox.
   */
  async getAccount(
    email: string
  ): Promise<InstantlyAccount | null> {
    const accounts = await this.listAccounts();

    return (
      accounts.find(
        (account) =>
          account.email.toLowerCase() === email.toLowerCase()
      ) ?? null
    );
  },

  /**
   * Enables or disables warm-up for a connected mailbox.
   */
  async setWarmup(
    email: string,
    enabled: boolean
  ): Promise<void> {
    await fetchJson(
      `${BASE_URL}/api/v2/accounts/${encodeURIComponent(
        email
      )}/warmup`,
      {
        provider: "instantly",
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          enabled,
        }),
        timeoutMs: 15_000,
      }
    );
  },

  /**
   * Creates a corresponding Instantly campaign for a Reigna campaign.
   */
  async createCampaign(
    name: string,
    senderEmail: string
  ): Promise<string> {
    const data = await fetchJson<{ id: string }>(
      `${BASE_URL}/api/v2/campaigns`,
      {
        provider: "instantly",
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          email_list: [senderEmail],
        }),
        timeoutMs: 20_000,
      }
    );

    return data.id;
  },

  /**
   * Adds a single approved lead + first-touch message
   * to an Instantly campaign.
   */
  async addLead(
    campaignId: string,
    lead: {
      email: string;
      firstName?: string;
      subject: string;
      body: string;
    }
  ): Promise<void> {
    await fetchJson(`${BASE_URL}/api/v2/leads`, {
      provider: "instantly",
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        campaign: campaignId,
        email: lead.email,
        first_name: lead.firstName,
        custom_variables: {
          subject: lead.subject,
          first_touch_body: lead.body,
        },
      }),
      timeoutMs: 20_000,
    });
  },

  /**
   * Starts sending for a campaign.
   * Reigna only calls this after human approval.
   */
  async activateCampaign(
    campaignId: string
  ): Promise<void> {
    await fetchJson(
      `${BASE_URL}/api/v2/campaigns/${campaignId}/activate`,
      {
        provider: "instantly",
        method: "POST",
        headers: authHeaders(),
        timeoutMs: 15_000,
      }
    );
  },

  /**
   * Pauses a running campaign.
   */
  async pauseCampaign(
    campaignId: string
  ): Promise<void> {
    await fetchJson(
      `${BASE_URL}/api/v2/campaigns/${campaignId}/pause`,
      {
        provider: "instantly",
        method: "POST",
        headers: authHeaders(),
        timeoutMs: 15_000,
      }
    );
  },
};

/**
 * Verifies an inbound Instantly webhook request.
 *
 * Instantly's dashboard lets an operator attach a custom header to
 * outbound webhook requests; Reigna uses that mechanism as its shared
 * secret rather than assuming an HMAC signature scheme this codebase
 * can't verify against undocumented behavior.
 *
 * Configure the same value in both:
 *
 * INSTANTLY_WEBHOOK_SECRET
 *
 * and the webhook's custom header in Instantly:
 *
 * x-reigna-webhook-secret
 */
export function verifyInstantlyWebhook(
  headerValue: string | null
): boolean {
  const secret = process.env.INSTANTLY_WEBHOOK_SECRET;

  if (!secret) {
    return false;
  }

  if (!headerValue) {
    return false;
  }

  return timingSafeEqual(headerValue, secret);
}

function timingSafeEqual(
  a: string,
  b: string
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}