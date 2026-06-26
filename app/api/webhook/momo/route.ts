import { NextResponse } from "next/server";

import { handleZuria } from "@/lib/payments/handlers/zuria";
import { handleDukaboda } from "@/lib/payments/handlers/dukaboda";

export async function POST(req: Request) {
  const payload = await req.json();

  const referenceId: string = payload.referenceId ?? "";

  if (referenceId.startsWith("ORD-")) {
    await handleZuria(payload);
  }

  if (referenceId.startsWith("DLV-")) {
    await handleDukaboda(payload);
  }

  return NextResponse.json({
    received: true,
  });
}
