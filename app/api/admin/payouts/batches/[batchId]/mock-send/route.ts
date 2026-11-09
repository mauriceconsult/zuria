import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { mockSendPayoutBatch } from "@/lib/payouts/mock-sender";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;

  const { batchId } = await params;
  try {
    const result = await mockSendPayoutBatch(batchId);
    return NextResponse.json({
      ...result,
      mode: "mock",
      message: "No payment was sent. Mock payouts require manual result reconciliation.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mock payout send failed";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
