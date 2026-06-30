import { NextResponse } from "next/server";

import { handleZuria } from "@/lib/payments/handlers/zuria";
import { handleDukaboda } from "@/lib/payments/handlers/dukaboda";

export async function POST(req: Request) {
  const payload = await req.json();
  const referenceId: string = payload.referenceId ?? "";

  try {
    if (referenceId.startsWith("ORD-")) {
      await handleZuria(payload);
    } else if (referenceId.startsWith("DLV-")) {
      await handleDukaboda(payload);
    } else {
      console.warn("[Zuria webhook] Unrecognised referenceId:", referenceId);
    }
  } catch (err) {
    console.error("[Zuria webhook] handler error", {
      referenceId,
      error: err instanceof Error ? err.message : err,
    });
    // TODO: dead-letter for manual replay
  }

  return NextResponse.json({ received: true });
}
