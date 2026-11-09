import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;
  const { batchId } = await params;
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  if (batch.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft batches can be approved." }, { status: 409 });
  }
  if (batch.createdBy === admin.userId || batch.approvedBy === admin.userId) {
    return NextResponse.json(
      { error: "A different payout administrator must approve this batch." },
      { status: 403 },
    );
  }

  const approved = await prisma.payoutBatch.updateMany({
    where: { id: batch.id, status: "DRAFT" },
    data: {
      status: "APPROVED",
      approvedBy: admin.userId!,
      approvedAt: new Date(),
    },
  });
  if (approved.count !== 1) {
    return NextResponse.json({ error: "Batch changed before approval." }, { status: 409 });
  }
  return NextResponse.json(
    await prisma.payoutBatch.findUniqueOrThrow({ where: { id: batch.id } }),
  );
}
