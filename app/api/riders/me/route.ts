// ─────────────────────────────────────────────────────────────────────────────
// app/api/riders/me/route.ts         GET  → profile
// app/api/riders/me/status/route.ts  PATCH → toggle isActive
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider) return NextResponse.json({ error: "Not registered" }, { status: 404 });

  return NextResponse.json(rider);
}

export async function PATCHStatus2(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isActive } = await req.json();

  const rider = await prisma.rider.update({
    where: { clerkId: userId },
    data:  { isActive },
  });

  return NextResponse.json(rider);
}