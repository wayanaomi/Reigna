-- Add campaign scheduling fields

ALTER TABLE "Campaign"
ADD COLUMN "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos';

CREATE INDEX "Campaign_scheduledAt_idx"
ON "Campaign"("scheduledAt");