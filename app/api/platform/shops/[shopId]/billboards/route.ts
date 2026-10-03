// app/api/platform/shops/[shopId]/billboards/route.ts
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

  const billboards = await prisma.billboard.findMany({ where: { shopId } });
  return NextResponse.json(billboards);
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

    const { label, imageUrl } = await req.json();
    if (!label)
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    if (!imageUrl)
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 },
      );

    const billboard = await prisma.billboard.create({
      data: { label, imageUrl, shopId },
    });
    return NextResponse.json(billboard);
  } catch (error) {
    console.error("[PLATFORM_BILLBOARDS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
