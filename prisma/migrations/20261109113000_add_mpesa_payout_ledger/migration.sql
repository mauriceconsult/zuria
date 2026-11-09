CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mpesa',
    "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "idempotencyKey" TEXT NOT NULL,
    "conversationId" TEXT,
    "receipt" TEXT,
    "receiverName" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutOrder" (
    "payoutId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "PayoutOrder_pkey" PRIMARY KEY ("payoutId", "orderId")
);

CREATE UNIQUE INDEX "Payout_idempotencyKey_key" ON "Payout"("idempotencyKey");
CREATE UNIQUE INDEX "Payout_conversationId_key" ON "Payout"("conversationId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_batchId_idx" ON "Payout"("batchId");
CREATE UNIQUE INDEX "PayoutOrder_orderId_recipientType_key"
    ON "PayoutOrder"("orderId", "recipientType");
CREATE INDEX "PayoutOrder_orderId_idx" ON "PayoutOrder"("orderId");

ALTER TABLE "Payout"
    ADD CONSTRAINT "Payout_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayoutOrder"
    ADD CONSTRAINT "PayoutOrder_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "Payout"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutOrder"
    ADD CONSTRAINT "PayoutOrder_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
