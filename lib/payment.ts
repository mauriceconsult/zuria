// lib/payment.ts
import { prisma } from "./prisma";
import { dispatchDelivery } from "./delivery-provider";
import { calculateFees } from "./platform";
import { momo } from "./momo";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { geocodeAddress } from "./delivery/geo-code";

type OrderWithShopAndItems = Prisma.OrderGetPayload<{
  include: {
    shop: true;
    orderItems: {
      include: { product: true };
    };
  };
}>;

export async function onPaymentConfirmed(
  orderId: string,
  session?: Stripe.Checkout.Session,
) {
  // Build address string from Stripe session if available
  const address = session?.customer_details?.address;
  const addressString = [
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.postal_code,
    address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Update order as paid
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      isPaid: true,
      paymentStatus: "completed",
      ...(addressString && { address: addressString }),
      ...(session?.customer_details?.phone && {
        phone: session.customer_details.phone,
      }),
    },
    include: {
      orderItems: {
        include: { product: true },
      },
      shop: true,
    },
  });

  // Archive sold products
  const productIds = order.orderItems.map((item) => item.productId);
  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { isArchived: true },
  });

  // Calculate payout
  const subtotal = order.orderItems.reduce(
    (sum, item) => sum + item.product.price.toNumber(),
    0,
  );
  const { platformFee } = calculateFees(
    subtotal,
    Number(order.deliveryCost ?? 0),
  );
  const shopPayout = subtotal - platformFee;

  // Store payout amount
  await prisma.order.update({
    where: { id: orderId },
    data: { shopPayout },
  });

  // Disburse to shop via MoMo if payment was mobile money
  if (order.paymentMethod === "mobile_money" && order.shop.momoPhone) {
    await disburseToShop({
      shopPhone: order.shop.momoPhone,
      amount: shopPayout,
      currency: order.shop.currency ?? "UGX",
      orderId: order.id,
    });
  }

  // Dispatch delivery if address exists
  if (order.address && order.deliveryMethod !== "pickup") {
    await handleDispatch(order);
  }

  return order;
}

// ─── Disburse to shop ────────────────────────────────────────────

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
    console.log(`[DISBURSE] Status: ${status.status}`);
  } catch (error) {
    // Never fail the order over a disbursement error
    console.error("[DISBURSE_ERROR]", error);
  }
}

// ─── Dispatch delivery ───────────────────────────────────────────

async function handleDispatch(order: OrderWithShopAndItems) {
  if (!order.shop.address || !order.shop.latitude || !order.shop.longitude) {
    console.error("[DISPATCH] Shop location not configured — skipping");
    return;
  }

  try {
    const geo = await geocodeAddress(order.address);

    const result = await dispatchDelivery({
      quoteId: order.deliveryQuoteId ?? "",
      pickupAddress: order.shop.address,
      pickupLat: order.shop.latitude,
      pickupLng: order.shop.longitude,
      pickupName: order.shop.name,
      pickupPhone: order.shop.phone ?? "",
      dropoffAddress: order.address,
      dropoffLat: geo.lat,
      dropoffLng: geo.lng,
      dropoffName: "Customer",
      dropoffPhone: order.phone,
      orderId: order.id,
    });

    // lib/payment.ts — update handleDispatch
    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryRef: result.deliveryId,
        deliveryStatus: "dispatched",
        deliveryProvider: result.provider,
        ...(result.trackingUrl && {
          deliveryTrackingUrl: result.trackingUrl,
        }),
      },
    });
  } catch (error) {
    console.error("[DISPATCH_ERROR]", error);
  }
}
