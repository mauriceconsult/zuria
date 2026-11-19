ALTER TABLE "Payout"
ADD COLUMN "payoutSetId" TEXT;

CREATE TABLE "PayoutSet" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "setNo" INTEGER NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "exportedBy" TEXT,
    "exportedAt" TIMESTAMP(3),
    "otherMoneySentToday" DECIMAL(65,30),
    "sentBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentAmount" DECIMAL(65,30),
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayoutSet_batchId_setNo_key"
ON "PayoutSet"("batchId", "setNo");

CREATE INDEX "PayoutSet_scheduledDate_status_idx"
ON "PayoutSet"("scheduledDate", "status");

CREATE INDEX "PayoutSet_batchId_status_idx"
ON "PayoutSet"("batchId", "status");

CREATE INDEX "Payout_payoutSetId_idx"
ON "Payout"("payoutSetId");

ALTER TABLE "PayoutSet"
ADD CONSTRAINT "PayoutSet_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payout"
ADD CONSTRAINT "Payout_payoutSetId_fkey"
FOREIGN KEY ("payoutSetId") REFERENCES "PayoutSet"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
