import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getProvider, normalizeProviderPhone } from "@/lib/payments/providers";
import { startCollection } from "@/lib/payments/collect";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { verifyDeliveryQuote } from "@/lib/delivery/quote-token";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await params;
  const {
    productIds,
    phone,
    providerId = "mtn-momo",
    address,
    deliveryMethod,
    deliveryQuoteId,
    deliveryLat,        
    deliveryLng,        
  } = await req.json();

  if (
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    productIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json({ error: "Product IDs are required." }, { status: 400 });
  }
  if (typeof phone !== "string") {
    return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unknown payment method." }, { status: 400 });
  }
  if (!normalizeProviderPhone(provider, phone)) {
    return NextResponse.json({ error: "Invalid phone number for this payment method." }, { status: 400 });
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  if (shop.currency.toUpperCase() !== provider.currency) {
    return NextResponse.json(
      { error: "This shop does not accept that payment method." },
      { status: 400 },
    );
  }

  let safeDeliveryCost = 0;
  let verifiedQuote:
    | ReturnType<typeof verifyDeliveryQuote>
    | undefined;
  if (deliveryMethod && deliveryMethod !== "pickup") {
    if (typeof deliveryQuoteId !== "string") {
      return NextResponse.json(
        { error: "A valid delivery quote is required." },
        { status: 400 },
      );
    }

    verifiedQuote = verifyDeliveryQuote(deliveryQuoteId);
    if (
      !verifiedQuote ||
      verifiedQuote.shopId !== shopId ||
      verifiedQuote.currency.toUpperCase() !== shop.currency.toUpperCase() ||
      verifiedQuote.provider !== getDeliveryProvider().name ||
      verifiedQuote.address !== address ||
      verifiedQuote.destination.lat !== deliveryLat ||
      verifiedQuote.destination.lng !== deliveryLng
    ) {
      return NextResponse.json(
        { error: "Delivery quote is invalid, expired, or does not match the order." },
        { status: 400 },
      );
    }
    safeDeliveryCost = verifiedQuote.cost;
  }

  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json(
      { error: "Duplicate products are not allowed." },
      { status: 400 },
    );
  }
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      shopId,
      isArchived: false,
    },
  });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json(
      { error: "One or more products are unavailable." },
      { status: 400 },
    );
  }

  const order = await prisma.order.create({
    data: {
      shopId,
      phone,
      address: address ?? "",
      paymentMethod: provider.id,
      deliveryMethod,
      deliveryCost: safeDeliveryCost,
      deliveryQuoteId: verifiedQuote?.providerQuoteId,
      deliveryProvider: verifiedQuote?.provider,
      deliveryLat: verifiedQuote?.destination.lat,
      deliveryLng: verifiedQuote?.destination.lng,
      orderItems: {
        create: productIds.map((productId: string) => ({ productId })),
      },
    },
  });

  try {
    const collection = await startCollection({
      orderId: order.id,
      providerId: provider.id,
      phone,
    });
    return NextResponse.json({
      ...collection,
      referenceId: collection.providerRef,
      providerId: provider.id,
      orderId: order.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start payment.";
    console.error("[Checkout] Payment collection failed", {
      orderId: order.id,
      providerId: provider.id,
      error: message,
    });
    return NextResponse.json(
      { error: message, orderId: order.id },
      { status: 502 },
    );
  }
}
