import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { momo } from "@/lib/momo";
import {
  getProvider,
  normalizeProviderPhone,
} from "@/lib/payments/providers";

export async function payRiderForDeliveredJob(jobId: string): Promise<void> {
  const job = await prisma.deliveryJob.findUnique({
    where: { id: jobId },
    include: {
      rider: true,
      order: {
        select: {
          id: true,
          isPaid: true,
          currency: true,
          riderPayout: true,
        },
      },
    },
  });

  if (!job || job.status !== "delivered" || !job.order.isPaid) return;
  if (!job.rider || !job.order.riderPayout) {
    console.error("[RIDER_PAYOUT] Delivered job has no rider or payout", {
      jobId,
    });
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "manual" },
    });
    return;
  }

  const payoutProvider = job.rider.payoutProvider || "mtn-momo";
  const currency = (job.order.currency ?? "UGX").toUpperCase();
  const provider = getProvider(payoutProvider);
  const phone = provider
    ? normalizeProviderPhone(provider, job.rider.phone)
    : undefined;
  const cooldownDays = Number(process.env.PAYOUT_PHONE_COOLDOWN_DAYS ?? 7);
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0) {
    throw new Error("PAYOUT_PHONE_COOLDOWN_DAYS must be a non-negative number");
  }
  if (
    job.rider.payoutDetailsUpdatedAt &&
    Date.now() - job.rider.payoutDetailsUpdatedAt.getTime() <
      cooldownDays * 86_400_000
  ) {
    console.warn("[RIDER_PAYOUT] Payout details are in the security cooldown", {
      jobId,
    });
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "on_hold" },
    });
    return;
  }

  const expectedCurrency = payoutProvider === "mpesa" ? "KES" : "UGX";
  if (
    !["mtn-momo", "mpesa"].includes(payoutProvider) ||
    currency !== expectedCurrency ||
    !phone
  ) {
    console.error("[RIDER_PAYOUT] Provider and order currency do not match", {
      jobId,
      payoutProvider,
      currency,
    });
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "manual" },
    });
    return;
  }

  const amount = Math.round(job.order.riderPayout.toNumber());
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    console.error("[RIDER_PAYOUT] Invalid payout amount", { jobId, amount });
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "manual" },
    });
    return;
  }

  if (payoutProvider === "mpesa") {
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "awaiting_manual_payout" },
    });
    console.info(
      "[RIDER_PAYOUT] KES rider payout queued for the manual Safaricom flow",
      { jobId },
    );
    return;
  }

  const payoutKey = `rider-delivery:${job.id}:${payoutProvider}`;
  const existingPayout = await prisma.disbursement.findUnique({
    where: { payoutKey },
    select: { id: true },
  });
  if (existingPayout) return;

  let disbursement;
  try {
    disbursement = await prisma.disbursement.create({
      data: {
        orderId: job.orderId,
        recipientType: "rider",
        provider: payoutProvider,
        phone,
        amount,
        currency,
        momoReferenceId: `PENDING-${randomUUID()}`,
        payoutKey,
        momoStatus: "PROCESSING",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.disbursement.findUnique({
        where: { payoutKey },
        select: { id: true },
      });
      if (!existing) throw error;
      console.info("[RIDER_PAYOUT] Duplicate payout request ignored", {
        jobId,
        payoutProvider,
      });
      return;
    }
    throw error;
  }

  try {
    const referenceId = await momo.disbursements.transfer({
      amount: String(amount),
      currency,
      externalId: job.orderId,
      payee: { partyIdType: "MSISDN", partyId: phone },
      payerMessage: `Dukaboda delivery payout — job ${job.id}`,
      payeeNote: "Dukaboda delivery earnings",
    });
    await prisma.disbursement.update({
      where: { id: disbursement.id },
      data: { momoReferenceId: referenceId },
    });

    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "sent" },
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Payout submission failed";
    await prisma.disbursement.update({
      where: { id: disbursement.id },
      data: { momoStatus: "UNKNOWN", failureReason: reason.slice(0, 500) },
    });
    await prisma.order.update({
      where: { id: job.orderId },
      data: { riderPayoutStatus: "unknown" },
    });
    console.error("[RIDER_PAYOUT] Submission result is unknown; do not retry", {
      jobId,
      payoutProvider,
      error: reason,
    });
  }
}

export async function releaseMaturedRiderPayouts(
  now = new Date(),
): Promise<{ released: number; failed: number }> {
  const cooldownDays = Number(process.env.PAYOUT_PHONE_COOLDOWN_DAYS ?? 7);
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0) {
    throw new Error("PAYOUT_PHONE_COOLDOWN_DAYS must be a non-negative number");
  }
  const cutoff = new Date(now.getTime() - cooldownDays * 86_400_000);
  const jobs = await prisma.deliveryJob.findMany({
    where: {
      status: "delivered",
      order: { isPaid: true, riderPayoutStatus: "on_hold" },
      rider: { is: { payoutDetailsUpdatedAt: { lte: cutoff } } },
    },
    select: { id: true },
  });

  let released = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await payRiderForDeliveredJob(job.id);
      released++;
    } catch (error) {
      failed++;
      console.error("[RIDER_PAYOUT] Held payout release failed", {
        jobId: job.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  return { released, failed };
}
