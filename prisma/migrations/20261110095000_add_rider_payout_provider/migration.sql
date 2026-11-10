ALTER TABLE "Rider"
ADD COLUMN "payoutProvider" TEXT NOT NULL DEFAULT 'mtn-momo',
ADD COLUMN "payoutDetailsUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Disbursement"
ADD COLUMN "payoutKey" TEXT,
ADD COLUMN "providerConversationId" TEXT,
ADD COLUMN "providerOriginatorId" TEXT,
ADD COLUMN "receipt" TEXT,
ADD COLUMN "receiverName" TEXT;

CREATE UNIQUE INDEX "Disbursement_payoutKey_key"
ON "Disbursement"("payoutKey");

CREATE UNIQUE INDEX "Disbursement_providerConversationId_key"
ON "Disbursement"("providerConversationId");

CREATE UNIQUE INDEX "Disbursement_providerOriginatorId_key"
ON "Disbursement"("providerOriginatorId");
