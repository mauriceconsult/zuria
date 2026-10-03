// app/api/platform/shops/[shopId]/sizes/route.ts
import { requirePlatformUser, getShopForUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const userId = await requirePlatformUser(req);
  if (!userId)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { shopId } = await params;
  const shop = await getShopForUser(shopId, userId);
  if (!shop)
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const sizes = await prisma.size.findMany({ where: { shopId } });
  return NextResponse.json(sizes);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { shopId } = await params;
    const shop = await getShopForUser(shopId, userId);
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    // POST body
  const { name, value } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!value)
    return NextResponse.json({ error: "value is required" }, { status: 400 });

  const size = await prisma.size.create({ data: { name, value, shopId } });
    return NextResponse.json(size);
  } catch (error) {
    console.error("[PLATFORM_SIZES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
