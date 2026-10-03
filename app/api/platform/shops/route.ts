import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const userId = await requirePlatformUser(req);
  if (!userId)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const shops = await prisma.shop.findMany({ where: { userId } });
  return NextResponse.json(shops);
}

export async function POST(req: Request) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { name } = await req.json();
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });

    const shop = await prisma.shop.create({ data: { name, userId } });
    return NextResponse.json(shop);
  } catch (error) {
    console.error("[PLATFORM_SHOPS_POST]", error);
    return NextResponse.json(
      {
        error: "Internal error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
