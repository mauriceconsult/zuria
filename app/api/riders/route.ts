// app/api/riders/route.ts  (Zuria)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // Use platform API key for cross-app calls from Dukaboda
  const apiKey = req.headers.get("x-api-key");

  // Also support Clerk auth for web dashboard calls
  // let userId: string | null = null;

  if (apiKey && apiKey === process.env.PLATFORM_API_KEY) {
    // Trusted cross-app call — clerkId comes in the body
    const body = await req.json();
    const { clerkId, name, phone, email, vehicleType } = body;

    if (!clerkId || !name || !phone || !email || !vehicleType) {
      return NextResponse.json(
        { error: "clerkId, name, phone, email and vehicleType are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.rider.findUnique({ where: { clerkId } });
    if (existing) return NextResponse.json(existing);

    const rider = await prisma.rider.create({
      data: { clerkId, name, phone, email, vehicleType },
    });
    return NextResponse.json(rider, { status: 201 });
  }

  // Fallback: Clerk auth for same-instance calls
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, email, vehicleType } = body;

  if (!name || !phone || !email || !vehicleType) {
    return NextResponse.json(
      { error: "name, phone, email and vehicleType are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.rider.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (existing) return NextResponse.json(existing);

  const rider = await prisma.rider.create({
    data: { clerkId: clerkUserId, name, phone, email, vehicleType },
  });
  return NextResponse.json(rider, { status: 201 });
}
