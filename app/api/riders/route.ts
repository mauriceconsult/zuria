// app/api/riders/route.ts  (Zuria)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  console.log("=== /api/riders called ===");

  const apiKey = req.headers.get("x-api-key");

  console.log({
    hasApiKey: !!apiKey,
    receivedApiKeyPrefix: apiKey?.substring(0, 8),
    expectedApiKeyPrefix: process.env.PLATFORM_API_KEY?.substring(0, 8),
    matches: apiKey === process.env.PLATFORM_API_KEY,
  });

  const body = await req.json();

  console.log("BODY:", body);

  const { clerkId, name, phone, email, vehicleType } = body;

  // validate fields...
  console.log("About to upsert rider:", {
    clerkId,
    name,
    phone,
    email,
    vehicleType,
  });

  const rider = await prisma.rider.upsert({
    where: { clerkId },
    update: {
      name,
      phone,
      email,
      vehicleType,
    },
    create: {
      clerkId,
      name,
      phone,
      email,
      vehicleType,
    },
  });
  console.log("Rider upsert successful:", rider);

  return NextResponse.json(rider, { status: 200 });
}
