import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { ensureApprovedPayoutSets } from "@/lib/payouts/safaricom-ledger";
import {
  getNairobiDateKey,
  nairobiDateStart,
} from "@/lib/payouts/safaricom";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;

  const batchesNeedingPlan = await prisma.payoutBatch.findMany({
    where: { status: "APPROVED", approvedAt: { not: null } },
    select: { id: true },
  });
  for (const batch of batchesNeedingPlan) {
    await ensureApprovedPayoutSets(batch.id);
  }

  const batches = await prisma.payoutBatch.findMany({
    where: {
      status: { in: ["APPROVED", "SENDING", "PAID"] },
      payoutSets: { some: {} },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      payoutSets: {
        orderBy: [{ scheduledDate: "asc" }, { setNo: "asc" }],
        include: { payouts: true },
      },
    },
  });
  const legacyBatchCount = await prisma.payoutBatch.count({
    where: { status: "SENDING", payoutSets: { none: {} } },
  });
  const allPayouts = batches.flatMap((batch) =>
    batch.payoutSets.flatMap((set) => set.payouts),
  );
  const shopIds = [
    ...new Set(
      allPayouts
        .filter((payout) => payout.recipientType === "shop")
        .map((payout) => payout.recipientId),
    ),
  ];
  const riderIds = [
    ...new Set(
      allPayouts
        .filter((payout) => payout.recipientType === "rider")
        .map((payout) => payout.recipientId),
    ),
  ];
  const [shops, riders] = await Promise.all([
    prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: { id: true, name: true },
    }),
    prisma.rider.findMany({
      where: { id: { in: riderIds } },
      select: { id: true, name: true },
    }),
  ]);
  const names = new Map([
    ...shops.map((shop) => [shop.id, shop.name] as const),
    ...riders.map((rider) => [rider.id, rider.name] as const),
  ]);

  const monday = new Date(`${getNairobiDateKey()}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const weeklySends = await prisma.payoutSet.count({
    where: {
      scheduledDate: {
        gte: nairobiDateStart(monday.toISOString().slice(0, 10)),
        lt: nextMonday,
      },
    },
  });

  return NextResponse.json({
    weeklySends,
    legacyBatchCount,
    batches: batches.map((batch) => ({
      id: batch.id,
      batchRef: batch.id.slice(0, 8).toUpperCase(),
      status: batch.status,
      totalAmount: batch.totalAmount.toNumber(),
      createdAt: batch.createdAt,
      payoutSets: batch.payoutSets.map((set) => ({
        id: set.id,
        setNo: set.setNo,
        scheduledDate: set.scheduledDate.toISOString().slice(0, 10),
        status: set.status,
        totalAmount: set.totalAmount.toNumber(),
        exportedAt: set.exportedAt,
        exportedBy: set.exportedBy,
        otherMoneySentToday: set.otherMoneySentToday?.toNumber() ?? null,
        sentAt: set.sentAt,
        sentBy: set.sentBy,
        sentAmount: set.sentAmount?.toNumber() ?? null,
        confirmedAt: set.confirmedAt,
        confirmedBy: set.confirmedBy,
        recipients: set.payouts.map((payout) => ({
          id: payout.id,
          name: names.get(payout.recipientId) ?? "Unknown recipient",
          role: payout.recipientType,
          phone: payout.phone,
          amount: payout.amount.toNumber(),
          currency: payout.currency,
          provider: payout.provider,
          status: payout.status,
        })),
      })),
    })),
  });
}
