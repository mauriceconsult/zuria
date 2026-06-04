// ─────────────────────────────────────────────────────────────────────────────
// app/api/riders/route.ts
//
// POST /api/riders   → self-register as a rider
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("POST /api/riders", body);

    const { name, phone, email, vehicleType } = body;

    if (!name || !phone || !email || !vehicleType) {
      return NextResponse.json(
        { error: "name, phone, email and vehicle type are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.rider.findUnique({
      where: { clerkId: userId },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const rider = await prisma.rider.create({
      data: {
        clerkId: userId,
        name,
        phone,
        email,
        vehicleType,
      },
    });

    return NextResponse.json(rider, { status: 201 });
  } catch (error) {
    console.error("RIDER REGISTRATION ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}