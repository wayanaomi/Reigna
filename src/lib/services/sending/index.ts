import type { MailboxProvider, SenderIdentity } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { toSenderIdentity } from "@/lib/services/mappers";
import {
  emptyError,
  emptyUnconfigured,
  ok,
  type ServiceListResult,
} from "@/lib/services/types";
import { instantlyProvider } from "@/lib/providers/instantly";
import { deliverabilityService } from "@/lib/services/deliverability";

/**
 * Sending / sender health service boundary — mailbox connection (brokered
 * entirely by Instantly's OAuth API), caps, SPF/DKIM/DMARC status
 * (checked directly via DNS), and warm-up progress.
 *
 * A SenderIdentity row is only created once an operator actually completes
 * a real OAuth connection; there is no default/demo mailbox.
 */
export interface SendingService {
  listSenderIdentities(
    ownerId: string
  ): Promise<ServiceListResult<SenderIdentity>>;

  getById(
    ownerId: string,
    id: string
  ): Promise<SenderIdentity | null>;

  startMailboxConnection(
    ownerId: string,
    provider: "google" | "microsoft",
    redirectUrl: string
  ): Promise<{
    sessionId: string;
    authorizationUrl: string;
  }>;

  checkMailboxConnection(
    ownerId: string,
    sessionId: string
  ): Promise<{
    state: string;
    message?: string;
  }>;

  syncSenderIdentity(
    ownerId: string,
    id: string
  ): Promise<void>;

  updateVoiceGuidance(
    ownerId: string,
    id: string,
    voiceGuidance: string
  ): Promise<void>;
}

class PrismaSendingService implements SendingService {
  async listSenderIdentities(
    ownerId: string
  ): Promise<ServiceListResult<SenderIdentity>> {
    if (!isDatabaseConfigured || !prisma) {
      return emptyUnconfigured();
    }

    try {
      const rows = await prisma.senderIdentity.findMany({
        where: { ownerId },
        orderBy: { createdAt: "asc" },
      });

      return ok(rows.map(toSenderIdentity));
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }

  async getById(
    ownerId: string,
    id: string
  ): Promise<SenderIdentity | null> {
    if (!isDatabaseConfigured || !prisma) {
      return null;
    }

    const row = await prisma.senderIdentity.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    return row ? toSenderIdentity(row) : null;
  }

  async startMailboxConnection(
    ownerId: string,
    provider: "google" | "microsoft",
    redirectUrl: string
  ): Promise<{
    sessionId: string;
    authorizationUrl: string;
  }> {
    if (!isDatabaseConfigured || !prisma) {
      throw new Error("Database is not connected.");
    }

    if (!instantlyProvider.isConfigured()) {
      throw new Error("Instantly is not configured.");
    }

    const { sessionId, authorizationUrl } =
      await instantlyProvider.initOAuth(
        provider,
        redirectUrl
      );

    await prisma.providerAccount.create({
      data: {
        ownerId,
        provider:
          provider === "google"
            ? "GOOGLE"
            : "MICROSOFT",
        sessionId,
        status: "PENDING",
      },
    });

    return {
      sessionId,
      authorizationUrl,
    };
  }

  async checkMailboxConnection(
    ownerId: string,
    sessionId: string
  ): Promise<{
    state: string;
    message?: string;
  }> {
    if (!isDatabaseConfigured || !prisma) {
      throw new Error("Database is not connected.");
    }

    const providerAccount =
      await prisma.providerAccount.findFirst({
        where: {
          sessionId,
          ownerId,
        },
      });

    if (!providerAccount) {
      throw new Error("No matching connection session.");
    }

    if (providerAccount.status !== "PENDING") {
      return {
        state: providerAccount.status.toLowerCase(),
        message:
          providerAccount.statusMessage ?? undefined,
      };
    }

    const status =
      await instantlyProvider.getOAuthSessionStatus(
        sessionId
      );

    if (status.state === "pending") {
      return {
        state: "pending",
      };
    }

    if (status.state === "failed") {
      await prisma.providerAccount.update({
        where: {
          id: providerAccount.id,
        },
        data: {
          status: "FAILED",
          statusMessage:
            status.message ?? "Connection failed.",
        },
      });

      return {
        state: "failed",
        message: status.message,
      };
    }

    // Connected
    const email = status.email;

    if (!email) {
      await prisma.providerAccount.update({
        where: {
          id: providerAccount.id,
        },
        data: {
          status: "FAILED",
          statusMessage:
            "Instantly didn't return a connected mailbox address.",
        },
      });

      return {
        state: "failed",
      };
    }

    const domain = email.split("@")[1] ?? "";

    if (!domain) {
      await prisma.providerAccount.update({
        where: {
          id: providerAccount.id,
        },
        data: {
          status: "FAILED",
          statusMessage:
            "The connected mailbox address is invalid.",
        },
      });

      return {
        state: "failed",
      };
    }

    const [account, deliverability] =
      await Promise.all([
        instantlyProvider.getAccount(email),
        deliverabilityService.checkDomain(domain),
      ]);

    /**
     * The mailbox field is globally unique in the Prisma schema.
     * Therefore we must explicitly verify ownership before updating
     * an existing SenderIdentity.
     */
    const existingSender =
      await prisma.senderIdentity.findUnique({
        where: {
          mailbox: email,
        },
      });

    if (
      existingSender &&
      existingSender.ownerId !== ownerId
    ) {
      await prisma.providerAccount.update({
        where: {
          id: providerAccount.id,
        },
        data: {
          status: "FAILED",
          statusMessage:
            "This mailbox is already connected to another Reigna account.",
        },
      });

      return {
        state: "failed",
        message:
          "This mailbox is already connected to another Reigna account.",
      };
    }

    const senderIdentity = existingSender
      ? await prisma.senderIdentity.update({
          where: {
            id: existingSender.id,
          },
          data: {
            provider:
              providerAccount.provider,
            providerAccountId:
              providerAccount.id,
            domain,
            dailyCap:
              account?.dailyLimit ??
              existingSender.dailyCap,
            warmupStatus:
              account?.warmupEnabled
                ? "WARMING"
                : "PAUSED",
            warmupScore:
              account?.warmupScore ??
              existingSender.warmupScore,
            spfValid:
              deliverability.spfValid,
            dkimValid:
              deliverability.dkimValid,
            dmarcValid:
              deliverability.dmarcValid,
            bounceRate:
              account?.bounceRate ??
              existingSender.bounceRate,
            providerStatus:
              account?.status ??
              "connected",
            providerStatusMessage:
              account?.statusMessage ??
              undefined,
            connectedAt:
              existingSender.connectedAt ??
              new Date(),
            lastSyncedAt: new Date(),
            lastDnsCheckedAt:
              new Date(
                deliverability.checkedAt
              ),
          },
        })
      : await prisma.senderIdentity.create({
          data: {
            ownerId,
            provider:
              providerAccount.provider,
            providerAccountId:
              providerAccount.id,
            mailbox: email,
            domain,
            dailyCap:
              account?.dailyLimit ?? 30,
            warmupStatus:
              account?.warmupEnabled
                ? "WARMING"
                : "PAUSED",
            warmupScore:
              account?.warmupScore ??
              undefined,
            spfValid:
              deliverability.spfValid,
            dkimValid:
              deliverability.dkimValid,
            dmarcValid:
              deliverability.dmarcValid,
            bounceRate:
              account?.bounceRate ?? 0,
            providerStatus:
              account?.status ??
              "connected",
            providerStatusMessage:
              account?.statusMessage ??
              undefined,
            connectedAt: new Date(),
            lastSyncedAt: new Date(),
            lastDnsCheckedAt:
              new Date(
                deliverability.checkedAt
              ),
          },
        });

    await prisma.providerAccount.update({
      where: {
        id: providerAccount.id,
      },
      data: {
        status: "CONNECTED",
        senderIdentityId:
          senderIdentity.id,
      },
    });

    return {
      state: "connected",
    };
  }

  async syncSenderIdentity(
    ownerId: string,
    id: string
  ): Promise<void> {
    if (!isDatabaseConfigured || !prisma) {
      throw new Error("Database is not connected.");
    }

    const identity =
      await prisma.senderIdentity.findFirst({
        where: {
          id,
          ownerId,
        },
      });

    if (!identity) {
      throw new Error("Sender identity not found.");
    }

    const [account, deliverability] =
      await Promise.all([
        instantlyProvider.isConfigured()
          ? instantlyProvider.getAccount(
              identity.mailbox
            )
          : Promise.resolve(null),
        deliverabilityService.checkDomain(
          identity.domain
        ),
      ]);

    await prisma.senderIdentity.update({
      where: {
        id: identity.id,
      },
      data: {
        dailyCap:
          account?.dailyLimit ??
          identity.dailyCap,

        sentToday: identity.sentToday,

        warmupStatus: account
          ? account.warmupEnabled
            ? "WARMING"
            : "PAUSED"
          : identity.warmupStatus,

        warmupScore:
          account?.warmupScore ??
          identity.warmupScore,

        bounceRate:
          account?.bounceRate ??
          identity.bounceRate,

        providerStatus:
          account?.status ??
          identity.providerStatus,

        providerStatusMessage:
          account?.statusMessage ??
          identity.providerStatusMessage,

        spfValid:
          deliverability.spfValid,

        dkimValid:
          deliverability.dkimValid,

        dmarcValid:
          deliverability.dmarcValid,

        lastSyncedAt: new Date(),

        lastDnsCheckedAt:
          new Date(
            deliverability.checkedAt
          ),
      },
    });
  }

  async updateVoiceGuidance(
    ownerId: string,
    id: string,
    voiceGuidance: string
  ): Promise<void> {
    if (!isDatabaseConfigured || !prisma) {
      throw new Error("Database is not connected.");
    }

    const result =
      await prisma.senderIdentity.updateMany({
        where: {
          id,
          ownerId,
        },
        data: {
          voiceGuidance:
            voiceGuidance.trim() || null,
        },
      });

    if (result.count === 0) {
      throw new Error(
        "Sender identity not found."
      );
    }
  }
}

export const sendingService: SendingService =
  new PrismaSendingService();

/**
 * Which mailbox connection infrastructure is
 * configured server-side.
 */
export function getMailboxProviderStatus(): {
  google: boolean;
  microsoft: boolean;
} {
  const configured =
    instantlyProvider.isConfigured();

  return {
    google: configured,
    microsoft: configured,
  };
}

/**
 * A sender identity is safe to send from when
 * its authentication and health records are valid.
 */
export function isIdentityHealthy(
  identity: SenderIdentity
): boolean {
  return (
    identity.spfValid &&
    identity.dkimValid &&
    identity.dmarcValid &&
    identity.bounceRate < 2 &&
    identity.complaintRate < 0.1
  );
}

export type { MailboxProvider };