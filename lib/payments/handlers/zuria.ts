import { prisma } from "@/lib/prisma";
import { MoMoWebhookPayload } from "../momo";


export async function handleZuria(payload: MoMoWebhookPayload): Promise<void> {
  const { referenceId, status, financialTransactionId } = payload;

  const order = await prisma.order.findFirst({
    where: {
      paymentRef: referenceId,
    },
  });

  if (!order) return;

  if (order.paymentStatus === "completed") {
    return;
  }

  await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      isPaid: status === "SUCCESSFUL",
      paymentStatus: status === "SUCCESSFUL" ? "completed" : "failed",
      paymentRef: financialTransactionId ?? order.paymentRef,
    },
  });

  console.info("[MoMo] Zuria order updated:", referenceId);
}
