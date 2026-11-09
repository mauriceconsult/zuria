import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { buildPayoutCsv } from "@/lib/payouts/csv";
import { validatePayoutRecipient } from "@/lib/payouts/ledger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;
  if (process.env.PAYOUTS_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Payout exports are disabled by PAYOUTS_ENABLED." },
      { status: 503 },
    );
  }

  const { batchId } = await params;
  const batch = await prisma.payoutBatch.findUnique({
    where: { id: batchId },
    include: { payouts: { orderBy: { recipientId: "asc" } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  if (!["APPROVED", "SENDING"].includes(batch.status)) {
    return NextResponse.json(
      { error: "Only approved batches can be exported." },
      { status: 409 },
    );
  }
  if (batch.payouts.length === 0 || batch.payouts.some((payout) => payout.status !== "BATCHED")) {
    return NextResponse.json(
      { error: "Batch payout states are inconsistent; review the batch manually." },
      { status: 409 },
    );
  }
  const invalidRecipient = await Promise.all(
    batch.payouts.map((payout) => validatePayoutRecipient(payout)),
  );
  const invalidIndex = invalidRecipient.findIndex(Boolean);
  if (invalidIndex !== -1) {
    const invalid = batch.payouts[invalidIndex];
    const reason = invalidRecipient[invalidIndex]!;
    await prisma.payout.update({
      where: { id: invalid.id },
      data: { status: "MANUAL", failureReason: reason },
    });
    const orderLinks = await prisma.payoutOrder.findMany({
      where: { payoutId: invalid.id },
      select: { orderId: true },
    });
    await prisma.order.updateMany({
      where: { id: { in: orderLinks.map((link) => link.orderId) } },
      data: {
        [invalid.recipientType === "shop" ? "shopPayoutStatus" : "riderPayoutStatus"]:
          "manual",
      },
    });
    return NextResponse.json(
      { error: "Recipient details changed; batch requires manual review." },
      { status: 409 },
    );
  }

  let csv: string;
  try {
    csv = buildPayoutCsv(batch.payouts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid CSV configuration." },
      { status: 500 },
    );
  }

  const started = await prisma.payoutBatch.updateMany({
    where: { id: batch.id, status: "APPROVED" },
    data: { status: "SENDING" },
  });
  if (batch.status === "APPROVED" && started.count !== 1) {
    return NextResponse.json({ error: "Batch changed before export." }, { status: 409 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mpesa-payout-${batch.id}.csv"`,
      "Cache-Control": "no-store",
      "X-Payout-Mode": "draft-csv-template",
      "X-Payout-Notice": "Draft format only. Confirm Safaricom's template before upload; never upload the same batch more than once.",
    },
  });
}
