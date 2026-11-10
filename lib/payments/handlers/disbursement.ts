import { prisma } from "@/lib/prisma";
import type { MoMoWebhookPayload } from "../momo";

export async function handleDisbursement(
  payload: MoMoWebhookPayload,
): Promise<boolean> {
  const disbursement = await prisma.disbursement.findUnique({
    where: { momoReferenceId: payload.referenceId },
  });
  if (!disbursement) return false;
  if (payload.status === "PENDING") return true;

  const successful = payload.status === "SUCCESSFUL";
  const updated = await prisma.disbursement.updateMany({
    where: {
      id: disbursement.id,
      momoStatus: { in: ["PROCESSING", "UNKNOWN"] },
    },
    data: {
      momoStatus: successful ? "SUCCESSFUL" : "FAILED",
      receipt: payload.financialTransactionId,
      failureReason: successful ? null : payload.reason?.slice(0, 500),
      ...(successful && { completedAt: new Date() }),
    },
  });
  if (!updated.count) return true;

  const status = successful ? "paid" : "failed";
  await prisma.order.update({
    where: { id: disbursement.orderId },
    data: {
      [disbursement.recipientType === "rider"
        ? "riderPayoutStatus"
        : "shopPayoutStatus"]: status,
    },
  });
  return true;
}
