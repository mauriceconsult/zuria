// app/api/debug/token/route.ts — replace with this
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const body = await req.json().catch(() => ({}));

  return NextResponse.json({
    receivedApiKey: apiKey?.substring(0, 12) ?? "MISSING",
    expectedApiKey: process.env.PLATFORM_API_KEY?.substring(0, 12) ?? "MISSING",
    keysMatch: apiKey === process.env.PLATFORM_API_KEY,
    body,
  });
}