// app/api/platform/shops/[shopId]/categories/route.ts
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

  const categories = await prisma.category.findMany({ where: { shopId } });
  return NextResponse.json(categories);
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
    const { name, billboardId } = await req.json();
    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!billboardId)
      return NextResponse.json(
        { error: "billboardId is required" },
        { status: 400 },
      );

    const category = await prisma.category.create({
      data: { name, billboardId, shopId },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("[PLATFORM_CATEGORIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
