import { prisma } from "@/lib/prisma";
import {
  getProvider,
  normalizeProviderPhone,
} from "@/lib/payments/providers";
import {
  getAdapter,
  type CollectionResponse,
} from "@/lib/payments/factory";
import { calculateFees } from "@/lib/platform";

export async function startCollection(p: {
  orderId: string;
  providerId: string;
  phone: string;
}) {
  const provider = getProvider(p.providerId);
  if (!provider) throw new Error("Unknown payment method");
  const phoneNumber = normalizeProviderPhone(provider, p.phone);
  if (!phoneNumber)
    throw new Error("Invalid phone number");

  const order = await prisma.order.findUnique({
    where: { id: p.orderId },
    include: { shop: true, orderItems: { include: { product: true } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.isPaid) throw new Error("Order already paid");
  if (provider.currency !== order.shop.currency.toUpperCase())
    throw new Error("This shop does not accept that payment method");

  const subtotal = order.orderItems.reduce(
    (total, item) => total + Number(item.product.price),
    0,
  );
  const fees = calculateFees(subtotal, Number(order.deliveryCost ?? 0));
  const amount = Math.round(fees.grandTotal);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Order total is invalid");
  }

  const recent = await prisma.paymentAttempt.findFirst({
    where: {
      orderId: order.id,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 3 * 60_000) },
    },
  });
  if (recent)
    throw new Error("A payment prompt was just sent. Check your phone.");

  await prisma.order.update({
    where: { id: order.id },
    data: {
      amount,
      currency: provider.currency,
      paymentMethod: provider.id,
      platformFee: fees.platformFee,
      paymentStatus: "pending",
    },
  });
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      provider: provider.id,
      amount,
      currency: provider.currency,
      phoneLast4: phoneNumber.slice(-4),
    },
  });

  let res: CollectionResponse;
  try {
    res = await getAdapter(provider.network).initiateCollection({
      amount: { value: amount, currency: provider.currency },
      phoneNumber,
      network: provider.network,
      reference: attempt.id,
    });
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        failureReason:
          error instanceof Error ? error.message.slice(0, 200) : "Provider error",
      },
    });
    throw error;
  }

  if (!res.success) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "FAILED", failureReason: res.message?.slice(0, 200) },
    });
    throw new Error(res.message ?? "Could not start payment");
  }
  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: { providerRef: res.transactionId },
  });
  return {
    attemptId: attempt.id,
    providerRef: res.transactionId,
    message: res.message,
  };
}
