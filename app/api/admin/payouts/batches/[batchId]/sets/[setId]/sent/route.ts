import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string; setId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A request body is required." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("sentAmount" in body) ||
    typeof body.sentAmount !== "number" ||
    !Number.isSafeInteger(body.sentAmount) ||
    body.sentAmount <= 0
  ) {
    return NextResponse.json(
      { error: "sentAmount must be the whole-KES amount sent." },
      { status: 400 },
    );
  }
  const sentAmount = body.sentAmount;

  const { batchId, setId } = await params;
  const set = await prisma.payoutSet.findFirst({
    where: { id: setId, batchId },
    include: { batch: true },
  });
  if (!set) return NextResponse.json({ error: "Payout set not found." }, { status: 404 });
  if (!["APPROVED", "SENDING"].includes(set.batch.status) || !set.batch.approvedAt) {
    return NextResponse.json({ error: "Payout batch is not approved." }, { status: 409 });
  }
  if (sentAmount !== set.totalAmount.toNumber()) {
    return NextResponse.json(
      {
        error: `Amount sent must equal the set total of KES ${set.totalAmount.toString()}.`,
      },
      { status: 409 },
    );
  }

  const sentAt = new Date();
  const transitioned = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.payoutSet.updateMany({
      where: {
        id: set.id,
        batchId,
        status: "PENDING",
        exportedAt: { not: null },
      },
      data: {
        status: "SENT",
        sentBy: admin.userId!,
        sentAt,
        sentAmount,
      },
    });
    if (claimed.count !== 1) return false;

    const payouts = await transaction.payout.updateMany({
      where: { payoutSetId: set.id, batchId, status: "BATCHED" },
      data: { status: "SENT", sentAt },
    });
    const expected = await transaction.payout.count({
      where: { payoutSetId: set.id, batchId },
    });
    if (expected !== payouts.count) {
      throw new Error("Payout records changed while the set was being marked sent");
    }

    const batch = await transaction.payoutBatch.updateMany({
      where: { id: batchId, status: { in: ["APPROVED", "SENDING"] } },
      data: { status: "SENDING" },
    });
    if (batch.count !== 1) {
      throw new Error("Approved batch changed while the set was being marked sent");
    }
    return true;
  });
  if (!transitioned) {
    return NextResponse.json(
      { error: "Only an exported pending set can be marked sent, and it can be claimed once." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    await prisma.payoutSet.findUniqueOrThrow({ where: { id: set.id } }),
  );
}
