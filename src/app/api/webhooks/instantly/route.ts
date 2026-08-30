import { NextRequest, NextResponse } from "next/server";
import { verifyInstantlyWebhook } from "@/lib/providers/instantly";
import { ingestInstantlyWebhookEvent } from "@/lib/services/tracking/ingest";

/**
 * Inbound webhook endpoint for Instantly delivery/engagement events.
 *
 * Security: rejects any request that doesn't carry the shared secret
 * configured in both `INSTANTLY_WEBHOOK_SECRET` and Instantly's webhook
 * custom-header configuration (see /src/lib/providers/instantly.ts). Never
 * logs the full payload or the secret itself.
 */
export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-reigna-webhook-secret");
  if (!verifyInstantlyWebhook(secretHeader)) {
    console.warn("[webhooks/instantly] rejected unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const result = await ingestInstantlyWebhookEvent(body);
    console.info("[webhooks/instantly] processed event", { status: result.status, eventType: body.event_type ?? body.type });
    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    console.error("[webhooks/instantly] processing failed", (error as Error).message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
