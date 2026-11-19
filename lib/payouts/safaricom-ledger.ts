import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getNairobiDateKey,
  nairobiDateStart,
  planSafaricomSets,
  type ReservedSafaricomSet,
} from "@/lib/payouts/safaricom";

type PayoutTransaction = Prisma.TransactionClient;

export async function planApprovedPayoutSets(
  transaction: PayoutTransaction,
  batchId: string,
  now = new Date(),
) {
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(294209847)`;

  const batch = await transaction.payoutBatch.findUnique({
    where: { id: batchId },
    select: { status: true, approvedAt: true },
  });
  if (!batch || batch.status !== "APPROVED" || !batch.approvedAt) {
    throw new Error("Only an approved payout batch can be scheduled");
  }

  const batchPayouts = await transaction.payout.findMany({
    where: { batchId },
    orderBy: [{ recipientType: "asc" }, { recipientId: "asc" }, { id: "asc" }],
  });
  if (
    batchPayouts.length === 0 ||
    batchPayouts.some(
      (payout) =>
        payout.status !== "BATCHED" ||
        payout.currency !== "KES" ||
        payout.provider !== "mpesa" ||
        !["shop", "rider"].includes(payout.recipientType),
    )
  ) {
    throw new Error("Payout batch contains an invalid state, provider, or currency");
  }

  const existingCount = await transaction.payoutSet.count({ where: { batchId } });
  if (existingCount > 0) {
    const assignedCount = await transaction.payout.count({
      where: { batchId, payoutSetId: { not: null } },
    });
    if (assignedCount !== batchPayouts.length) {
      throw new Error("Payout batch has an incomplete set plan; review it manually");
    }
    return;
  }

  const today = getNairobiDateKey(now);
  const reservedRows = await transaction.payoutSet.findMany({
    where: { scheduledDate: { gte: nairobiDateStart(today) } },
    include: { payouts: { select: { recipientId: true, amount: true } } },
  });
  const reservedSets: ReservedSafaricomSet[] = reservedRows.map((set) => ({
    scheduledDate: set.scheduledDate.toISOString().slice(0, 10),
    recipients: set.payouts.map((payout) => ({
      recipientId: payout.recipientId,
      amount: payout.amount.toNumber(),
    })),
  }));
  const planned = planSafaricomSets(
    batchPayouts.map((payout) => ({
      id: payout.id,
      recipientId: payout.recipientId,
      recipientType: payout.recipientType === "shop" ? "shop" : "rider",
      amount: payout.amount.toNumber(),
    })),
    reservedSets,
    now,
  );

  for (const set of planned) {
    const created = await transaction.payoutSet.create({
      data: {
        batchId,
        setNo: set.setNo,
        scheduledDate: nairobiDateStart(set.scheduledDate),
        totalAmount: set.totalAmount,
      },
    });
    const assigned = await transaction.payout.updateMany({
      where: {
        id: { in: set.payoutIds },
        batchId,
        payoutSetId: null,
        status: "BATCHED",
      },
      data: { payoutSetId: created.id },
    });
    if (assigned.count !== set.payoutIds.length) {
      throw new Error("Payouts changed while their Safaricom sets were being planned");
    }
  }
}

export async function ensureApprovedPayoutSets(batchId: string, now = new Date()) {
  await prisma.$transaction((transaction) =>
    planApprovedPayoutSets(transaction, batchId, now),
  );
}
