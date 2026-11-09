import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { NextResponse } from "next/server";

const FINAL_STATUSES = ["PAID", "FAILED", "UNKNOWN", "MANUAL"] as const;
type FinalStatus = (typeof FINAL_STATUSES)[number];

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string; payoutId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;

  const { batchId, payoutId } = await params;
  const body = (await request.json()) as {
    status?: string;
    phone?: string;
    amount?: number;
    receipt?: string;
    receiverName?: string;
    failureCode?: string;
    failureReason?: string;
  };
  if (!FINAL_STATUSES.includes(body.status as FinalStatus)) {
    return NextResponse.json({ error: "Invalid final payout status." }, { status: 400 });
  }
  if (
    typeof body.phone !== "string" ||
    !Number.isSafeInteger(body.amount) ||
    typeof body.amount !== "number"
  ) {
    return NextResponse.json(
      { error: "The payout phone and exact whole-unit amount are required." },
      { status: 400 },
    );
  }
  if (body.status === "PAID" && !body.receipt?.trim()) {
    return NextResponse.json({ error: "A payment receipt is required." }, { status: 400 });
  }

  const payout = await prisma.payout.findFirst({
    where: { id: payoutId, batchId },
    include: { orders: { select: { orderId: true, recipientType: true } } },
  });
  if (!payout) return NextResponse.json({ error: "Payout not found." }, { status: 404 });
  if (payout.phone !== body.phone || payout.amount.toNumber() !== body.amount) {
    return NextResponse.json(
      { error: "Reported phone or amount does not match the ledger." },
      { status: 409 },
    );
  }
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.status !== "SENDING") {
    return NextResponse.json({ error: "Batch is not being processed." }, { status: 409 });
  }

  const status = body.status as FinalStatus;
  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.payout.updateMany({
      where: { id: payout.id, batchId, status: { in: ["BATCHED", "SENT"] } },
      data: {
        status,
        receipt: status === "PAID" ? body.receipt!.trim() : null,
        receiverName: body.receiverName?.trim().slice(0, 200),
        paidAt: status === "PAID" ? new Date() : null,
        failureCode: body.failureCode?.slice(0, 100),
        failureReason: body.failureReason?.slice(0, 500),
      },
    });
    if (result.count !== 1) {
      throw new Error("Payout is already reconciled or has an invalid state");
    }

    const orderIds = payout.orders.map((order) => order.orderId);
    const orderStatus =
      status === "PAID"
        ? "paid"
        : status === "FAILED"
          ? "failed"
          : "manual";
    if (payout.recipientType === "shop") {
      await transaction.order.updateMany({
        where: { id: { in: orderIds } },
        data: { shopPayoutStatus: orderStatus },
      });
    } else {
      await transaction.order.updateMany({
        where: { id: { in: orderIds } },
        data: { riderPayoutStatus: orderStatus },
      });
    }

    const remaining = await transaction.payout.count({
      where: { batchId, status: { in: ["BATCHED", "SENT", "ELIGIBLE"] } },
    });
    if (remaining === 0) {
      const failures = await transaction.payout.count({
        where: { batchId, status: { not: "PAID" } },
      });
      await transaction.payoutBatch.update({
        where: { id: batchId },
        data: { status: failures === 0 ? "DONE" : "PARTIAL" },
      });
    }
    return transaction.payout.findUniqueOrThrow({ where: { id: payout.id } });
  });
  return NextResponse.json(updated);
}
