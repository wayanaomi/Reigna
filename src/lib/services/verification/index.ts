import type { VerificationStatus } from "@/types";
import { hunterProvider } from "@/lib/providers/hunter";
import { ProviderError } from "@/lib/providers/http";

export interface VerificationOutcome {
  configured: boolean;
  status?: VerificationStatus;
  confidence?: number;
  error?: string;
}

/**
 * Email verification service boundary — confirms a discovered email
 * address is deliverable before it's used for outbound (Hunter.io API v2).
 * A contact is never presented as "verified" unless Hunter actually
 * confirmed it — `accept_all`/`unknown` map to RISKY, never VERIFIED.
 */
export interface VerificationService {
  isConfigured(): boolean;
  verifyEmail(email: string): Promise<VerificationOutcome>;
}

function mapStatus(status: string): VerificationStatus {
  switch (status) {
    case "valid":
      return "VERIFIED";
    case "invalid":
    case "disposable":
      return "INVALID";
    case "accept_all":
    case "webmail":
    case "unknown":
    default:
      return "RISKY";
  }
}

class HunterVerificationService implements VerificationService {
  isConfigured(): boolean {
    return hunterProvider.isConfigured();
  }

  async verifyEmail(email: string): Promise<VerificationOutcome> {
    if (!this.isConfigured()) return { configured: false };
    try {
      const result = await hunterProvider.verifyEmail(email);
      return { configured: true, status: mapStatus(result.status), confidence: result.score };
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Reigna couldn't verify this address.";
      return { configured: true, error: message };
    }
  }
}

export const verificationService: VerificationService = new HunterVerificationService();

