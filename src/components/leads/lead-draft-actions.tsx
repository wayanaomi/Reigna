"use client";

import { approveMessage, rejectMessage } from "@/app/(app)/leads/[id]/actions";
import { Button } from "@/components/ui/button";

export function LeadDraftActions({ messageId, contactId }: { messageId: string; contactId: string }) {
  return (
    <div className="flex gap-2">
      <form action={approveMessage.bind(null, messageId, contactId)}>
        <Button type="submit" size="sm">
          Approve
        </Button>
      </form>
      <form action={rejectMessage.bind(null, messageId, contactId)}>
        <Button type="submit" variant="destructive" size="sm">
          Reject
        </Button>
      </form>
    </div>
  );
}
