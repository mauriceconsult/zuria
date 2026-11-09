import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/payments/providers";
import { getAdapter } from "@/lib/payments/factory";
import { onPaymentConfirmed } from "@/lib/payment";

export async function reconcileAttempt(
  where: { providerRef?: string; id?: string },
  receipt?: string,
) {
  const attempt = await prisma.paymentAttempt.findFirst({ where });
  if (!attempt) return "NOT_FOUND";

  if (attempt.status !== "COMPLETED") {
    if (!attempt.providerRef) return "PENDING";
    const provider = getProvider(attempt.provider);
    if (!provider) throw new Error(`Unknown payment provider: ${attempt.provider}`);
    const verification = await getAdapter(provider.network).verifyPayment(
      attempt.id,
      attempt.providerRef,
    );

    if (verification.status === "FAILED") {
      await prisma.paymentAttempt.updateMany({
        where: { id: attempt.id, status: { in: ["PENDING", "FAILED"] } },
        data: {
          status: "FAILED",
          failureReason: verification.failureReason?.slice(0, 200),
        },
      });
      return "FAILED";
    }
    if (verification.status !== "COMPLETED") return "PENDING";

    const won = await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { in: ["PENDING", "FAILED"] } },
      data: {
        status: "COMPLETED",
        receipt: receipt ?? verification.receipt,
        failureReason: null,
      },
    });
    if (won.count === 0) return "COMPLETED";
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: attempt.orderId },
  });
  if (order.isPaid && order.paymentRef !== attempt.providerRef) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { needsRefund: true },
    });
    return "COMPLETED";
  }

  if (!order.isPaid) {
    const confirmed = await onPaymentConfirmed(order.id, {
      paymentMethod: attempt.provider,
      paymentRef: attempt.providerRef!,
    });
    if (!confirmed) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { needsRefund: true },
      });
    }
  }
  return "COMPLETED";
}
