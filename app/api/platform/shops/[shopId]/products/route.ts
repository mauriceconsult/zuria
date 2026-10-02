import { getShopForUser, requirePlatformUser } from "@/lib/platform-auth";
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

  const products = await prisma.product.findMany({ where: { shopId } });
  return NextResponse.json(products);
}

export async function POST(
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

  const {
    name,
    price,
    categoryId,
    colorId,
    sizeId,
    images,
    isFeatured,
    isArchived,
  } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (price === undefined || price === null)
    return NextResponse.json({ error: "price is required" }, { status: 400 });
  if (!categoryId || !colorId || !sizeId)
    return NextResponse.json(
      { error: "categoryId, colorId, and sizeId are required" },
      { status: 400 },
    );
  if (!images?.length)
    return NextResponse.json({ error: "images are required" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name,
      price,
      categoryId,
      colorId,
      sizeId,
      shopId,
      isFeatured,
      isArchived,
      images: {
        createMany: { data: images.map((image: { url: string }) => image) },
      },
    },
  });
  return NextResponse.json(product);
}
