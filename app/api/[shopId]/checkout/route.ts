// app/api/[shopId]/checkout/route.ts (Stripe)

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { calculateFees } from "@/lib/platform";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await params;

  if (!stripe) {
    return new NextResponse(
      "Card payments are not available yet. Please use Mobile Money.",
      { status: 503 },
    );
  }

  const {
    productIds,
    deliveryMethod,
    deliveryCost,
    deliveryAddress,
    deliveryQuoteId,
    deliveryProvider,   // ← new
    deliveryLat,        // ← new
    deliveryLng,        // ← new
    phone,
  } = await req.json();

  if (!productIds || productIds.length === 0) {
    return new NextResponse("Product Ids are required.", { status: 400 });
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return new NextResponse("Shop not found.", { status: 404 });

  const currency         = (shop.currency ?? "USD").toLowerCase();
  const safeDeliveryCost = Number(deliveryCost ?? 0);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  if (products.length === 0) {
    return new NextResponse("No valid products found.", { status: 404 });
  }

  const subtotal = products.reduce(
    (sum, p) => sum + p.price.toNumber(), 0
  );
  const { platformFee } = calculateFees(subtotal, safeDeliveryCost);

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...products.map((p) => ({
      quantity: 1,
      price_data: {
        currency,
        product_data: { name: p.name },
        unit_amount: Math.round(p.price.toNumber() * 100),
      },
    })),
    ...(safeDeliveryCost > 0 ? [{
      quantity: 1,
      price_data: {
        currency,
        product_data: { name: `Delivery — ${deliveryMethod}` },
        unit_amount: Math.round(safeDeliveryCost * 100),
      },
    }] : []),
    {
      quantity: 1,
      price_data: {
        currency,
        product_data: { name: "Platform Fee (10%)" },
        unit_amount: Math.round(platformFee * 100),
      },
    },
  ];

  const order = await prisma.order.create({
    data: {
      shopId,
      phone,
      address:          deliveryAddress,
      paymentMethod:    "stripe",
      deliveryMethod,
      deliveryCost:     safeDeliveryCost,
      deliveryQuoteId,
      deliveryProvider, // ← new
      deliveryLat,      // ← new
      deliveryLng,      // ← new
      platformFee,
      orderItems: {
        create: productIds.map((productId: string) => ({ productId })),
      },
    },
  });

  const session = await stripe.checkout.sessions.create({
    line_items,
    mode: "payment",
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    success_url: `${process.env.FRONTEND_STORE_URL}/cart?success=1`,
    cancel_url:  `${process.env.FRONTEND_STORE_URL}/cart?cancel=1`,
    metadata: { orderId: order.id },
  });

  return NextResponse.json({ url: session.url }, { headers: corsHeaders });
}
