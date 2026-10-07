// app/api/platform/riders/me/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const userId = await requirePlatformUser(req);
  if (!userId)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rider);
}

export async function PATCH(req: Request) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { isActive } = await req.json();
    const rider = await prisma.rider.update({
      where: { clerkId: userId },
      data: { isActive },
    });
    return NextResponse.json(rider);
  } catch (error) {
    console.error("[PLATFORM_RIDERS_ME_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
