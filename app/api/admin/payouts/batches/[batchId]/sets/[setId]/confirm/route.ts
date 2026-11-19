import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string; setId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;

  const { batchId, setId } = await params;
  const set = await prisma.payoutSet.findFirst({
    where: { id: setId, batchId },
    include: { batch: true, payouts: { select: { id: true } } },
  });
  if (!set) return NextResponse.json({ error: "Payout set not found." }, { status: 404 });
  if (!["APPROVED", "SENDING"].includes(set.batch.status) || !set.batch.approvedAt) {
    return NextResponse.json({ error: "Payout batch is not approved." }, { status: 409 });
  }

  const confirmedAt = new Date();
  const transitioned = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(294209847)`;
    const claimed = await transaction.payoutSet.updateMany({
      where: { id: set.id, batchId, status: "SENT" },
      data: {
        status: "CONFIRMED",
        confirmedBy: admin.userId!,
        confirmedAt,
      },
    });
    if (claimed.count !== 1) return false;

    const payoutIds = set.payouts.map((payout) => payout.id);
    const payouts = await transaction.payout.updateMany({
      where: { id: { in: payoutIds }, payoutSetId: set.id, status: "SENT" },
      data: { status: "PAID", paidAt: confirmedAt },
    });
    if (payouts.count !== payoutIds.length) {
      throw new Error("Payout records changed while the set was being confirmed");
    }

    const orderLinks = await transaction.payoutOrder.findMany({
      where: { payoutId: { in: payoutIds } },
      select: { orderId: true, recipientType: true },
    });
    const shopOrderIds = orderLinks
      .filter((link) => link.recipientType === "shop")
      .map((link) => link.orderId);
    const riderOrderIds = orderLinks
      .filter((link) => link.recipientType === "rider")
      .map((link) => link.orderId);
    if (shopOrderIds.length) {
      await transaction.order.updateMany({
        where: { id: { in: shopOrderIds } },
        data: { shopPayoutStatus: "paid" },
      });
    }
    if (riderOrderIds.length) {
      await transaction.order.updateMany({
        where: { id: { in: riderOrderIds } },
        data: { riderPayoutStatus: "paid" },
      });
    }

    const unfinishedSets = await transaction.payoutSet.count({
      where: { batchId, status: { not: "CONFIRMED" } },
    });
    if (unfinishedSets === 0) {
      const batch = await transaction.payoutBatch.updateMany({
        where: { id: batchId, status: { in: ["APPROVED", "SENDING"] } },
        data: { status: "PAID" },
      });
      if (batch.count !== 1) {
        throw new Error("Payout batch changed while its final set was being confirmed");
      }
    }
    return true;
  });
  if (!transitioned) {
    return NextResponse.json(
      { error: "Only a sent set can be confirmed, and it can be claimed once." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    await prisma.payoutSet.findUniqueOrThrow({ where: { id: set.id } }),
  );
}
