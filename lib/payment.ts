// lib/payment.ts
import { prisma } from "@/lib/prisma";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { momo } from "@/lib/momo";
import { Prisma } from "@prisma/client";

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: true;
      };
    };
    shop: true; // Fetch full shop (includes currency, momoPhone, etc.)
  };
}>;

export async function onPaymentConfirmed(orderId: string): Promise<void> {
  // ── 1. Fetch order with relations ─────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: { include: { product: true } },
      shop: true, // ← Full shop to avoid missing fields
    },
  });

  if (!order) {
    console.error(`[onPaymentConfirmed] Order not found: ${orderId}`);
    return;
  }

  if (order.isPaid) {
    console.log(`[onPaymentConfirmed] Order ${orderId} already processed.`);
    return;
  }

  // ── 2. Calculate payout ───────────────────────────────────────────────
  const subtotal = order.orderItems.reduce(
    (sum, item) => sum + item.product.price.toNumber(),
    0,
  );

  const shopPayout = subtotal - (order.platformFee?.toNumber() ?? 0);

  // ── 3. Update order as paid ───────────────────────────────────────────
  await prisma.order.update({
    where: { id: orderId },
    data: {
      isPaid: true,
      paymentStatus: "paid",
      shopPayout,
    },
  });

  // ── 4. Archive sold products ──────────────────────────────────────────
  const productIds = order.orderItems.map((item) => item.productId);
  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { isArchived: true },
  });

  // ── 5. Disburse to Shop via MoMo ──────────────────────────────────────
  if (order.paymentMethod === "mobile_money" && order.shop.momoPhone) {
    await disburseToShop({
      shopPhone: order.shop.momoPhone,
      amount: shopPayout,
      currency: order.shop.currency ?? "UGX", // ← Now safe
      orderId: order.id,
    });
  }

  // ── 6. Trigger Delivery ───────────────────────────────────────────────
  const needsDelivery =
    order.deliveryMethod !== "pickup" &&
    order.deliveryQuoteId &&
    order.deliveryProvider &&
    order.address &&
    order.deliveryLat &&
    order.deliveryLng &&
    order.shop.latitude &&
    order.shop.longitude;

  if (needsDelivery) {
    await handleDelivery(order);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Disburse to Shop
// ─────────────────────────────────────────────────────────────────────
async function disburseToShop({
  shopPhone,
  amount,
  currency,
  orderId,
}: {
  shopPhone: string;
  amount: number;
  currency: string;
  orderId: string;
}) {
  try {
    const referenceId = await momo.disbursements.transfer({
      amount: String(Math.round(amount)),
      currency,
      externalId: orderId,
      payee: {
        partyIdType: "MSISDN",
        partyId: shopPhone,
      },
      payerMessage: "Shop payout for order",
      payeeNote: `Order ${orderId} payout`,
    });

    const status = await momo.disbursements.getTransactionStatus(referenceId);
    console.log(
      `[DISBURSE] Success for order ${orderId} - Status: ${status.status}`,
    );
  } catch (error) {
    console.error(`[DISBURSE_ERROR] Order ${orderId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Handle Delivery
// ─────────────────────────────────────────────────────────────────────
async function handleDelivery(order: OrderWithRelations) {
  try {
    const provider = getDeliveryProvider();

    const delivery = await provider.createJob({
      quoteId: order.deliveryQuoteId!,
      orderId: order.id,
      shopId: order.shopId,
      provider: order.deliveryProvider!,
      origin: {
        lat: order.shop.latitude!,
        lng: order.shop.longitude!,
        address: order.shop.address ?? "Shop address",
        contactName: order.shop.name,
        contactPhone: order.shop.phone ?? "",
      },
      destination: {
        lat: order.deliveryLat!,
        lng: order.deliveryLng!,
        address: order.address!,
        contactName: "Customer",
        contactPhone: order.phone ?? "",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryRef: delivery.deliveryId,
        deliveryStatus: delivery.status,
        deliveryTrackingUrl: delivery.trackingUrl ?? null,
      },
    });

    console.log(`[DELIVERY] Created for order ${order.id}`);
  } catch (err) {
    console.error(`[DELIVERY_ERROR] Order ${order.id}:`, err);
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: "failed" },
    });
  }
}
