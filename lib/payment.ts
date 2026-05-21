// lib/payment.ts  (Zuria)

import { prisma } from "@/lib/prisma";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { momo } from "@/lib/momo";
import { calculateFees } from "@/lib/platform";
import { Prisma } from "@prisma/client";
import type { ApprovalSource } from "@/lib/platform";

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    orderItems: { include: { product: true } };
    shop: true;
  };
}>;

export async function onPaymentConfirmed(orderId: string): Promise<void> {
  // ── 1. Fetch order ─────────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: { include: { product: true } },
      shop: true,
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

  // ── 2. Find assigned rider (if delivery job exists) ────────────────────────
  const deliveryJob = await prisma.deliveryJob.findUnique({
    where:   { orderId },
    include: { rider: true },
  });

  // Determine rider approval source for fee calculation
  const approvalSource: ApprovalSource =
    deliveryJob?.rider?.approvedBy === "platform" ? "platform" : "shop";

  // ── 3. Calculate fees ──────────────────────────────────────────────────────
  const subtotal     = order.orderItems.reduce(
    (sum, item) => sum + item.product.price.toNumber(),
    0,
  );
  const deliveryCost = order.deliveryCost?.toNumber() ?? 0;

  const { platformFee, deliveryFee, shopPayout, riderPayout, vendlyTotal } =
    calculateFees(subtotal, deliveryCost, approvalSource);

  console.log(`[onPaymentConfirmed] Order ${orderId}:`, {
    subtotal,
    deliveryCost,
    approvalSource,
    platformFee,
    deliveryFee,
    shopPayout,
    riderPayout,
    vendlyTotal,
  });

  // ── 4. Mark order as paid ──────────────────────────────────────────────────
  await prisma.order.update({
    where: { id: orderId },
    data: {
      isPaid:        true,
      paymentStatus: "paid",
      shopPayout,
      platformFee,
    },
  });

  // ── 5. Archive sold products ───────────────────────────────────────────────
  const productIds = order.orderItems.map((item) => item.productId);
  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data:  { isArchived: true },
  });

  // ── 6. Disburse to shop ────────────────────────────────────────────────────
  if (order.paymentMethod === "mobile_money" && order.shop.momoPhone) {
    await disburseToPhone({
      phone:    order.shop.momoPhone,
      amount:   shopPayout,
      currency: order.shop.currency ?? "UGX",
      orderId:  order.id,
      note:     `Shop payout for order ${order.id}`,
    });
  }

  // ── 7. Disburse to rider ───────────────────────────────────────────────────
  // Only if there's an assigned rider with a phone number and delivery cost
  if (deliveryJob?.rider?.phone && deliveryCost > 0 && riderPayout > 0) {
    await disburseToPhone({
      phone:    deliveryJob.rider.phone,
      amount:   riderPayout,
      currency: order.shop.currency ?? "UGX",
      orderId:  order.id,
      note:     `Dukaboda delivery payout — order ${order.id}${
        deliveryFee > 0
          ? ` (platform fee UGX ${deliveryFee} deducted)`
          : ""
      }`,
    });

    console.log(
      `[RIDER_PAYOUT] Rider ${deliveryJob.rider.name} receives UGX ${riderPayout}` +
      (deliveryFee > 0 ? ` (Vendly kept UGX ${deliveryFee})` : " (full fee — shop-linked rider)"),
    );
  }

  // ── 8. Trigger delivery ────────────────────────────────────────────────────
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
    await handleDelivery(order, deliveryCost);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared MoMo disburse helper
// ─────────────────────────────────────────────────────────────────────────────

async function disburseToPhone({
  phone,
  amount,
  currency,
  orderId,
  note,
}: {
  phone:    string;
  amount:   number;
  currency: string;
  orderId:  string;
  note:     string;
}) {
  try {
    const referenceId = await momo.disbursements.transfer({
      amount:    String(Math.round(amount)),
      currency,
      externalId: orderId,
      payee: {
        partyIdType: "MSISDN",
        partyId:     phone,
      },
      payerMessage: note,
      payeeNote:    note,
    });

    const status = await momo.disbursements.getTransactionStatus(referenceId);
    console.log(`[DISBURSE] ${phone} — UGX ${amount} — Status: ${status.status}`);
  } catch (error) {
    console.error(`[DISBURSE_ERROR] ${phone} — Order ${orderId}:`, error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle delivery job creation
// ─────────────────────────────────────────────────────────────────────────────

async function handleDelivery(order: OrderWithRelations, deliveryCost: number) {
  try {
    const provider = getDeliveryProvider();

    const delivery = await provider.createJob({
      quoteId:  order.deliveryQuoteId!,
      orderId:  order.id,
      shopId:   order.shopId,
      provider: order.deliveryProvider!,
      origin: {
        lat:          order.shop.latitude!,
        lng:          order.shop.longitude!,
        address:      order.shop.address ?? "Shop address",
        contactName:  order.shop.name,
        contactPhone: order.shop.phone ?? "",
      },
      destination: {
        lat:          order.deliveryLat!,
        lng:          order.deliveryLng!,
        address:      order.address!,
        contactName:  "Customer",
        contactPhone: order.phone ?? "",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryRef:        delivery.deliveryId,
        deliveryStatus:     delivery.status,
        deliveryTrackingUrl: delivery.trackingUrl ?? null,
      },
    });

    // Also update the DeliveryJob with actual cost
    await prisma.deliveryJob.upsert({
      where:  { orderId: order.id },
      update: { deliveryCost },
      create: {
        orderId:      order.id,
        deliveryCost,
        status:       "pending",
      },
    });

    console.log(`[DELIVERY] Created for order ${order.id}`);
  } catch (err) {
    console.error(`[DELIVERY_ERROR] Order ${order.id}:`, err);
    await prisma.order.update({
      where: { id: order.id },
      data:  { deliveryStatus: "failed" },
    });
  }
}
