import { prisma } from "@/lib/prisma";
import { MoMoWebhookPayload } from "../momo";


export async function handleDukaboda(
  payload: MoMoWebhookPayload,
): Promise<void> {
  const { referenceId, status } = payload;

  const job = await prisma.deliveryJob.findFirst({
    where: {
      order: {
        deliveryRef: referenceId,
      },
    },
  });

  if (!job) return;

  await prisma.deliveryJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: status === "SUCCESSFUL" ? "paid" : "payment_failed",
    },
  });

  console.info("[MoMo] Delivery payment updated:", referenceId);
}
