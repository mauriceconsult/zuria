import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/payouts/admin";
import {
  buildEligiblePayoutBatches,
  createEligiblePayouts,
} from "@/lib/payouts/ledger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const eligibility = await createEligiblePayouts();
    const today = new Date();
    const batches = await buildEligiblePayoutBatches({
      includeShops: today.getUTCDay() === 1,
      now: today,
    });
    return NextResponse.json({ eligibility, ...batches });
  } catch (error) {
    console.error("[PAYOUT_CRON] Payout run failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: "Payout run failed" },
      { status: 500 },
    );
  }
}
