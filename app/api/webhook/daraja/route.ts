import { NextResponse } from "next/server";
import { reconcileAttempt } from "@/lib/payments/reconcile";

export const dynamic = "force-dynamic";

interface DarajaCallback {
  Body?: {
    stkCallback?: {
      CheckoutRequestID?: string;
      ResultCode?: number | string;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name?: string; Value?: string | number }>;
      };
    };
  };
}

export async function POST(req: Request) {
  let payload: DarajaCallback;
  try {
    payload = (await req.json()) as DarajaCallback;
  } catch {
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  const callback = payload.Body?.stkCallback;
  if (!callback?.CheckoutRequestID || callback.ResultCode == null) {
    return NextResponse.json({ error: "Incomplete Daraja callback." }, { status: 400 });
  }

  try {
    const receipt = callback.CallbackMetadata?.Item?.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;
    const status = await reconcileAttempt(
      { providerRef: callback.CheckoutRequestID },
      receipt == null ? undefined : String(receipt),
    );
    if (status === "NOT_FOUND") {
      console.warn("[Daraja webhook] Unknown checkout request:", callback.CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received." });
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Callback received." });
  } catch (error) {
    console.error("[Daraja webhook] Reconciliation failed", {
      checkoutRequestId: callback.CheckoutRequestID,
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Payment reconciliation failed." },
      { status: 500 },
    );
  }
}
