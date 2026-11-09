import { prisma } from "@/lib/prisma";
import { validatePayoutRecipient } from "@/lib/payouts/ledger";

export async function mockSendPayoutBatch(batchId: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock payouts are disabled in production");
  }
  if (process.env.PAYOUTS_MOCK_SENDER_ENABLED !== "true") {
    throw new Error("PAYOUTS_MOCK_SENDER_ENABLED must be true to use the mock sender");
  }
  if (process.env.PAYOUTS_ENABLED !== "true") {
    throw new Error("Payout sending is disabled by PAYOUTS_ENABLED");
  }

  const payouts = await prisma.payout.findMany({
    where: { batchId, status: "BATCHED" },
  });
  if (payouts.length === 0) throw new Error("Batch has no batched payouts");
  for (const payout of payouts) {
    const issue = await validatePayoutRecipient(payout);
    if (issue) throw new Error(`Payout ${payout.id} requires manual review: ${issue}`);
  }

  await prisma.$transaction(async (transaction) => {
    const batch = await transaction.payoutBatch.updateMany({
      where: { id: batchId, status: "APPROVED" },
      data: { status: "SENDING" },
    });
    if (batch.count !== 1) throw new Error("Batch is not approved");

    for (const payout of payouts) {
      const result = await transaction.payout.updateMany({
        where: { id: payout.id, batchId, status: "BATCHED" },
        data: {
          status: "SENT",
          conversationId: `MOCK-${payout.id}`,
          sentAt: new Date(),
        },
      });
      if (result.count !== 1) {
        throw new Error(`Payout ${payout.id} changed while sending mock request`);
      }
    }
  });

  return { accepted: payouts.length };
}
