import { NextResponse } from "next/server";
import {
  handleDarajaB2cCallback,
  isAuthorizedDarajaB2cCallback,
} from "@/lib/payments/daraja-b2c-callback";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthorizedDarajaB2cCallback(new URL(request.url))) {
    return NextResponse.json({ error: "Unauthorized callback." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  try {
    const result = await handleDarajaB2cCallback(payload);
    if (result === "NOT_FOUND") {
      console.warn("[Daraja B2C] Callback did not match a disbursement");
      return NextResponse.json({ error: "Unknown payout." }, { status: 503 });
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received." });
  } catch (error) {
    console.error("[Daraja B2C] Result callback failed", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: "Payout reconciliation failed." },
      { status: 500 },
    );
  }
}
