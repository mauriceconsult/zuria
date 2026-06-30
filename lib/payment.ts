// lib/payment.ts  (Zuria)

import { prisma } from "@/lib/prisma";
import { getDeliveryProvider } from "@/lib/delivery/registry";
import { momo } from "@/lib/momo";
import { calculateFees } from "@/lib/platform";
import { Prisma, VehicleType } from "@prisma/client";
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
    where: { orderId },
    include: { rider: true },
  });

  const approvalSource: ApprovalSource =
    deliveryJob?.rider?.approvedBy === "platform" ? "platform" : "shop";

  // ── 3. Calculate fees ──────────────────────────────────────────────────────
  const subtotal = order.orderItems.reduce(
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

  // ── 4. Mark order paid + archive products atomically ────────────────────────
  const productIds = order.orderItems.map((item) => item.productId);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paymentStatus: "completed", // matches schema's documented enum-by-convention
        shopPayout,
        platformFee,
        shopPayoutStatus: order.shop.momoPhone ? "pending" : "not_applicable",
        riderPayoutStatus: riderPayout > 0 ? "pending" : "not_applicable",
      },
    }),
    prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { isArchived: true },
    }),
  ]);

  // ── 5. Disburse to shop + rider in parallel, failure-isolated ──────────────
  const disbursements: Promise<void>[] = [];

  if (order.paymentMethod === "mobile_money" && order.shop.momoPhone) {
    disbursements.push(
      disburseToPhone({
        recipientType: "shop",
        phone: order.shop.momoPhone,
        amount: shopPayout,
        currency: order.shop.currency,
        orderId: order.id,
        note: `Shop payout for order ${order.id}`,
      })
        .then(() =>
          prisma.order.update({
            where: { id: orderId },
            data: { shopPayoutStatus: "sent" },
          }),
        )
        .then(() => {})
        .catch(async (err) => {
          console.error(`[SHOP_DISBURSE_ERROR] Order ${orderId}:`, err);
          await prisma.order.update({
            where: { id: orderId },
            data: { shopPayoutStatus: "failed" },
          });
        }),
    );
  }

  if (deliveryJob?.rider?.phone && riderPayout > 0) {
    disbursements.push(
      disburseToPhone({
        recipientType: "rider",
        phone: deliveryJob.rider.phone,
        amount: riderPayout,
        currency: order.shop.currency,
        orderId: order.id,
        note: `Dukaboda delivery payout — order ${order.id}${
          deliveryFee > 0 ? ` (platform fee UGX ${deliveryFee} deducted)` : ""
        }`,
      })
        .then(() => {
          console.log(
            `[RIDER_PAYOUT] Rider ${deliveryJob.rider!.name} receives UGX ${riderPayout}` +
              (deliveryFee > 0
                ? ` (Vendly kept UGX ${deliveryFee})`
                : " (full fee — shop-linked rider)"),
          );
          return prisma.order.update({
            where: { id: orderId },
            data: { riderPayoutStatus: "sent" },
          });
        })
        .then(() => {})
        .catch(async (err) => {
          console.error(`[RIDER_DISBURSE_ERROR] Order ${orderId}:`, err);
          await prisma.order.update({
            where: { id: orderId },
            data: { riderPayoutStatus: "failed" },
          });
        }),
    );
  }

  await Promise.allSettled(disbursements);

  // ── 6. Trigger delivery ──────────────────────────────────────────────────
  if (
    order.deliveryMethod !== "pickup" &&
    order.deliveryQuoteId &&
    order.deliveryProvider &&
    order.address &&
    order.deliveryLat != null &&
    order.deliveryLng != null &&
    order.shop.latitude != null &&
    order.shop.longitude != null
  ) {
    await handleDelivery(order, {
      quoteId: order.deliveryQuoteId,
      provider: order.deliveryProvider,
      shopLat: order.shop.latitude,
      shopLng: order.shop.longitude,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      address: order.address,
      deliveryCost,
      vehicleType: deliveryJob?.rider?.vehicleType,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared MoMo disburse helper — persists a Disbursement record
// ─────────────────────────────────────────────────────────────────────────────

async function disburseToPhone({
  recipientType,
  phone,
  amount,
  currency,
  orderId,
  note,
}: {
  recipientType: "shop" | "rider";
  phone: string;
  amount: number;
  currency: string;
  orderId: string;
  note: string;
}): Promise<void> {
  const referenceId = await momo.disbursements.transfer({
    amount: String(Math.round(amount)),
    currency,
    externalId: orderId,
    payee: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: note,
    payeeNote: note,
  });

  // Persisted immediately — this row is what the MoMo webhook dispatcher
  // matches against when the SUCCESSFUL/FAILED callback arrives later.
  await prisma.disbursement.create({
    data: {
      orderId,
      recipientType,
      phone,
      amount,
      currency,
      momoReferenceId: referenceId,
      momoStatus: "PROCESSING",
    },
  });

  console.log(
    `[DISBURSE] ${recipientType} ${phone} — UGX ${amount} — ref ${referenceId}`,
  );
  // Final status resolved by webhook, not polled synchronously here.
}

// ─────────────────────────────────────────────────────────────────────────────
// Handle delivery job creation
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryParams {
  quoteId: string;
  provider: string;
  shopLat: number;
  shopLng: number;
  deliveryLat: number;
  deliveryLng: number;
  address: string;
  deliveryCost: number;
  vehicleType?: VehicleType;
}

async function handleDelivery(
  order: OrderWithRelations,
  params: DeliveryParams,
) {
  try {
    const provider = getDeliveryProvider();

    const delivery = await provider.createJob({
      quoteId: params.quoteId,
      orderId: order.id,
      shopId: order.shopId,
      provider: params.provider,
      origin: {
        lat: params.shopLat,
        lng: params.shopLng,
        address: order.shop.address ?? "Shop address",
        contactName: order.shop.name,
        contactPhone: order.shop.phone ?? "",
      },
      destination: {
        lat: params.deliveryLat,
        lng: params.deliveryLng,
        address: params.address,
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

    // DeliveryJob now carries shopId + vehicleType, both real columns.
    // deliveryCost is intentionally NOT overwritten here if a job already
    // exists from quote time — only set on first creation.
    await prisma.deliveryJob.upsert({
      where: { orderId: order.id },
      update: {
        shopId: order.shopId,
        vehicleType: params.vehicleType,
      },
      create: {
        orderId: order.id,
        shopId: order.shopId,
        deliveryCost: params.deliveryCost,
        vehicleType: params.vehicleType,
        status: "pending",
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
