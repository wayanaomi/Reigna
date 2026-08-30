import { NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { campaignsService } from "@/lib/services/campaigns";

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await campaignsService.list(ownerId);
  if (!campaigns.configured) return NextResponse.json({ configured: false });

  const totals = campaigns.items.reduce(
    (acc, c) => {
      acc.sent += c.stats.sent;
      acc.delivered += c.stats.delivered;
      acc.opened += c.stats.opened;
      acc.clicked += c.stats.clicked;
      acc.replied += c.stats.replied;
      acc.bounced += c.stats.bounced;
      acc.unsubscribed += c.stats.unsubscribed;
      acc.followUpsSent += c.stats.followUpsSent;
      return acc;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0, followUpsSent: 0 }
  );

  return NextResponse.json({ configured: true, totals });
}
