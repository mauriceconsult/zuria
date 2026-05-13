// app/api/[shopId]/delivery/create/route.ts
// Creates a physical delivery job with the provider after payment is confirmed.
// Called internally from the checkout/payment confirmation flow.

import { prisma } from "@/lib/prisma";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;
    const body = await req.json();
    const {
      orderId,
      quoteId,
      provider,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
    } = body as {
      orderId:         string;
      quoteId:         string;
      provider:        string;
      customerName:    string;
      customerPhone:   string;
      deliveryAddress: string;
      deliveryLat:     number;
      deliveryLng:     number;
    };

    // ── Validate order exists and belongs to shop ──────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shopId: true, isPaid: true },
    });

    if (!order || order.shopId !== shopId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.isPaid) {
      return NextResponse.json(
        { error: "Cannot create delivery for unpaid order" },
        { status: 422 }
      );
    }

    // ── Get shop details for pickup ────────────────────────────────────────
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        latitude: true,
        longitude: true,
        address: true,
        name: true,
        phone: true,
      },
    });

    if (!shop?.latitude || !shop?.longitude) {
      return NextResponse.json(
        { error: "Shop location not configured" },
        { status: 422 }
      );
    }

    // ── Create delivery job ────────────────────────────────────────────────
    const deliveryProvider = getDeliveryProvider();
    const delivery = await deliveryProvider.createJob({
      quoteId,
      orderId,
      shopId,
      provider,
      origin: {
        lat:          shop.latitude,
        lng:          shop.longitude,
        address:      shop.address ?? "Shop address",
        contactName:  shop.name,
        contactPhone: shop.phone ?? "",
      },
      destination: {
        lat:          deliveryLat,
        lng:          deliveryLng,
        address:      deliveryAddress,
        contactName:  customerName,
        contactPhone: customerPhone,
      },
    });

    // ── Update order with delivery info ────────────────────────────────────
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryRef:         delivery.deliveryId,
        deliveryStatus:      delivery.status,
        deliveryProvider:    delivery.provider,
        deliveryTrackingUrl: delivery.trackingUrl ?? null,
      },
    });

    return NextResponse.json({
      deliveryId:  delivery.deliveryId,
      trackingUrl: delivery.trackingUrl,
      status:      delivery.status,
      provider:    delivery.provider,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create delivery";
    console.error("[delivery/create]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
