import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REFUND_WINDOW_HOURS = 48;
const DEFAULT_PHONE_COOLDOWN_DAYS = 7;

export type RecipientType = "shop" | "rider";

function getPositiveLimit(name: string): number {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be configured as a positive whole number`);
  }
  return value;
}

export function normalizedKenyanPhone(
  phone: string | null | undefined,
): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  const national = local.startsWith("254") ? local.slice(3) : local;
  if (!/^[17]\d{8}$/.test(national)) return undefined;
  return `254${national}`;
}

export async function validatePayoutRecipient(
  payout: { recipientType: string; recipientId: string; phone: string },
  now = new Date(),
): Promise<string | undefined> {
  const record =
    payout.recipientType === "shop"
      ? await prisma.shop.findUnique({
          where: { id: payout.recipientId },
          select: { momoPhone: true, phone: true, updatedAt: true },
        })
      : payout.recipientType === "rider"
        ? await prisma.rider.findUnique({
            where: { id: payout.recipientId },
            select: { phone: true, updatedAt: true },
          })
        : null;
  if (!record) return "Recipient record not found";

  const cooldownDays = Number(
    process.env.PAYOUT_PHONE_COOLDOWN_DAYS ?? DEFAULT_PHONE_COOLDOWN_DAYS,
  );
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0) {
    throw new Error("PAYOUT_PHONE_COOLDOWN_DAYS must be a non-negative number");
  }
  if (
    now.getTime() - record.updatedAt.getTime() <
    cooldownDays * 86_400_000
  ) {
    return "Recipient account changed within the phone cooldown period";
  }

  const rawPhone =
    payout.recipientType === "shop"
      ? ("momoPhone" in record ? record.momoPhone : null) || record.phone
      : record.phone;
  const currentPhone = normalizedKenyanPhone(rawPhone);
  if (!currentPhone) return "Recipient has no valid Kenyan payout phone";
  if (currentPhone !== payout.phone) {
    return "Recipient payout phone changed after ledger entry";
  }
  return undefined;
}

async function markPayoutManual(payoutId: string, reason: string) {
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "MANUAL", failureReason: reason.slice(0, 500) },
  });
  await updateLinkedOrderStatus(payoutId, "manual");
}

function periodStart(date: Date, recipientType: RecipientType): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (recipientType === "rider") return day;
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  return day;
}

function formatPeriod(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addPeriod(date: Date, recipientType: RecipientType): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + (recipientType === "rider" ? 1 : 7));
  return next;
}

function openOrRefunded(status: string): boolean {
  return status !== "rejected";
}

async function addOrderShare(input: {
  orderId: string;
  recipientType: RecipientType;
  recipientId: string;
  phone: string;
  amount: number;
  now: Date;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Payout share must be a positive whole number of Kenyan shillings");
  }
  const existingLink = await prisma.payoutOrder.findFirst({
    where: { orderId: input.orderId, recipientType: input.recipientType },
    select: { payoutId: true },
  });
  if (existingLink) return false;

  let start = periodStart(input.now, input.recipientType);
  let payoutId = "";
  const maxPeriodSearch = 520;
  for (let index = 0; index < maxPeriodSearch; index++) {
    const idempotencyKey =
      `${input.recipientId}:${input.recipientType}:${formatPeriod(start)}`;
    const existing = await prisma.payout.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, batchId: true, phone: true },
    });
    if (!existing) {
      const created = await prisma.payout.create({
        data: {
          recipientType: input.recipientType,
          recipientId: input.recipientId,
          phone: input.phone,
          amount: 0,
          currency: "KES",
          provider: "mpesa",
          status: "ELIGIBLE",
          idempotencyKey,
        },
        select: { id: true },
      });
      payoutId = created.id;
      break;
    }
    if (
      existing.status === "ELIGIBLE" &&
      !existing.batchId &&
      existing.phone === input.phone
    ) {
      payoutId = existing.id;
      break;
    }
    if (
      existing.status === "ELIGIBLE" &&
      !existing.batchId &&
      existing.phone !== input.phone
    ) {
      await markPayoutManual(
        existing.id,
        "Recipient phone changed; verify the old ledger entries manually",
      );
    }
    start = addPeriod(start, input.recipientType);
  }
  if (!payoutId) {
    throw new Error(`Could not allocate payout period for ${input.recipientId}`);
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.payoutOrder.create({
      data: {
        payoutId,
        orderId: input.orderId,
        recipientType: input.recipientType,
        amount: input.amount,
      },
    });
    await transaction.payout.update({
      where: { id: payoutId },
      data: { amount: { increment: input.amount } },
    });
    await transaction.order.update({
      where: { id: input.orderId },
      data: {
        [input.recipientType === "shop" ? "shopPayoutStatus" : "riderPayoutStatus"]:
          "eligible",
      },
    });
  });
  return true;
}

export async function createEligiblePayouts(now = new Date()) {
  const cooldownDays = Number(
    process.env.PAYOUT_PHONE_COOLDOWN_DAYS ?? DEFAULT_PHONE_COOLDOWN_DAYS,
  );
  if (!Number.isFinite(cooldownDays) || cooldownDays < 0) {
    throw new Error("PAYOUT_PHONE_COOLDOWN_DAYS must be a non-negative number");
  }
  const cooldownMs = cooldownDays * 86_400_000;
  const orders = await prisma.order.findMany({
    where: {
      isPaid: true,
      deliveredAt: { not: null, lte: new Date(now.getTime() - REFUND_WINDOW_HOURS * 3_600_000) },
      OR: [
        { currency: "KES" },
        { currency: null, shop: { currency: "KES" } },
      ],
    },
    include: {
      shop: true,
      jobs: { include: { rider: true } },
      refundRequest: true,
      payoutOrders: { select: { recipientType: true } },
    },
  });

  let created = 0;
  let skipped = 0;
  const pastCooldown = new Date(now.getTime() - cooldownMs);

  for (const order of orders) {
    if (
      order.refundRequest &&
      (order.refundRequest.expiresAt > now ||
        openOrRefunded(order.refundRequest.status))
    ) {
      skipped++;
      continue;
    }

    const shares: Array<{
      recipientType: RecipientType;
      recipientId: string;
      phone: string | null;
      updatedAt: Date;
      amount: number;
    }> = [];
    if (order.shopPayout && order.shopPayout.toNumber() > 0) {
      shares.push({
        recipientType: "shop",
        recipientId: order.shop.id,
        phone: order.shop.momoPhone || order.shop.phone,
        updatedAt: order.shop.updatedAt,
        amount: Math.round(order.shopPayout.toNumber()),
      });
    }
    if (
      order.riderPayout &&
      order.riderPayout.toNumber() > 0 &&
      order.jobs?.rider
    ) {
      shares.push({
        recipientType: "rider",
        recipientId: order.jobs.rider.id,
        phone: order.jobs.rider.phone,
        updatedAt: order.jobs.rider.updatedAt,
        amount: Math.round(order.riderPayout.toNumber()),
      });
    }

    for (const share of shares) {
      if (order.payoutOrders.some((link) => link.recipientType === share.recipientType)) {
        skipped++;
        continue;
      }
      if (share.updatedAt > pastCooldown) {
        skipped++;
        continue;
      }

      const phone = normalizedKenyanPhone(share.phone);
      if (!phone) {
        console.warn("[PAYOUT] Recipient has no valid Kenyan payout phone", {
          orderId: order.id,
          recipientId: share.recipientId,
          recipientType: share.recipientType,
        });
        skipped++;
        continue;
      }

      try {
        if (
          await addOrderShare({
            orderId: order.id,
            recipientType: share.recipientType,
            recipientId: share.recipientId,
            phone,
            amount: share.amount,
            now,
          })
        ) {
          created++;
        } else {
          skipped++;
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const link = await prisma.payoutOrder.findFirst({
            where: { orderId: order.id, recipientType: share.recipientType },
            select: { payoutId: true },
          });
          if (link) {
            skipped++;
            continue;
          }
        }
        throw error;
      }
    }
  }
  return { created, skipped, examined: orders.length };
}

export async function buildEligiblePayoutBatches(input: {
  now?: Date;
  includeShops: boolean;
}) {
  const now = input.now ?? new Date();
  const maxRecipient = getPositiveLimit("PAYOUT_MAX_RECIPIENT_KES");
  const maxDaily = getPositiveLimit("PAYOUT_MAX_DAILY_KES");
  const autoApprovalLimit = Math.max(
    0,
    Number(process.env.PAYOUT_AUTO_APPROVAL_LIMIT_KES ?? 0),
  );
  if (!Number.isSafeInteger(autoApprovalLimit)) {
    throw new Error("PAYOUT_AUTO_APPROVAL_LIMIT_KES must be a whole number");
  }

  const payouts = await prisma.payout.findMany({
    where: {
      status: "ELIGIBLE",
      batchId: null,
      currency: "KES",
      ...(input.includeShops ? {} : { recipientType: "rider" }),
    },
    orderBy: [{ recipientType: "asc" }, { recipientId: "asc" }],
  });
  const candidates: typeof payouts = [];
  for (const payout of payouts) {
    const recipientProblem = await validatePayoutRecipient(payout, now);
    if (recipientProblem) {
      console.error("[PAYOUT] Recipient validation failed before batching", {
        payoutId: payout.id,
        reason: recipientProblem,
      });
      await markPayoutManual(payout.id, recipientProblem);
      continue;
    }
    if (payout.amount.toNumber() > maxRecipient) {
      console.error("[PAYOUT] Recipient payout exceeds configured cap", {
        payoutId: payout.id,
        amount: payout.amount.toString(),
        cap: maxRecipient,
      });
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "MANUAL", failureReason: "Recipient payout cap exceeded" },
      });
      await updateLinkedOrderStatus(payout.id, "manual");
      continue;
    }

    const utcStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ));
    const existingToday = await prisma.payout.aggregate({
      where: {
        recipientType: payout.recipientType,
        recipientId: payout.recipientId,
        currency: payout.currency,
        status: { in: ["BATCHED", "SENT", "PAID"] },
        createdAt: { gte: utcStart },
        id: { not: payout.id },
      },
      _sum: { amount: true },
    });
    const todayTotal =
      (existingToday._sum.amount?.toNumber() ?? 0) + payout.amount.toNumber();
    if (todayTotal > maxDaily) {
      console.error("[PAYOUT] Recipient daily payout cap exceeded", {
        payoutId: payout.id,
        recipientId: payout.recipientId,
        amount: todayTotal,
        cap: maxDaily,
      });
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "MANUAL", failureReason: "Daily recipient payout cap exceeded" },
      });
      await updateLinkedOrderStatus(payout.id, "manual");
      continue;
    }
    const anomalyLimit = Number(process.env.PAYOUT_ANOMALY_ALERT_KES ?? 0);
    if (anomalyLimit > 0 && payout.amount.toNumber() >= anomalyLimit) {
      console.warn("[PAYOUT] Payout exceeds configured anomaly alert threshold", {
        payoutId: payout.id,
        amount: payout.amount.toString(),
        threshold: anomalyLimit,
      });
    }
    candidates.push(payout);
  }

  if (candidates.length === 0) return { batches: [], excluded: payouts.length };
  const totalAmount = candidates.reduce(
    (total, payout) => total + payout.amount.toNumber(),
    0,
  );
  const autoApproved = totalAmount <= autoApprovalLimit;
  const batch = await prisma.$transaction(async (transaction) => {
    const created = await transaction.payoutBatch.create({
      data: {
        status: autoApproved ? "APPROVED" : "DRAFT",
        totalAmount,
        createdBy: "scheduler",
        approvedBy: autoApproved ? "automatic" : null,
        approvedAt: autoApproved ? now : null,
      },
    });
    const updated = await transaction.payout.updateMany({
      where: {
        id: { in: candidates.map((payout) => payout.id) },
        status: "ELIGIBLE",
        batchId: null,
      },
      data: { status: "BATCHED", batchId: created.id },
    });
    if (updated.count !== candidates.length) {
      throw new Error("Payout batch changed while it was being built; retry the job");
    }
    const links = await transaction.payoutOrder.findMany({
      where: { payoutId: { in: candidates.map((payout) => payout.id) } },
      select: { orderId: true, recipientType: true },
    });
    const shopOrderIds = links
      .filter((link) => link.recipientType === "shop")
      .map((link) => link.orderId);
    const riderOrderIds = links
      .filter((link) => link.recipientType === "rider")
      .map((link) => link.orderId);
    if (shopOrderIds.length) {
      await transaction.order.updateMany({
        where: { id: { in: shopOrderIds } },
        data: { shopPayoutStatus: "batched" },
      });
    }
    if (riderOrderIds.length) {
      await transaction.order.updateMany({
        where: { id: { in: riderOrderIds } },
        data: { riderPayoutStatus: "batched" },
      });
    }
    return created;
  });
  return { batches: [batch], excluded: payouts.length - candidates.length };
}

async function updateLinkedOrderStatus(payoutId: string, status: string) {
  const links = await prisma.payoutOrder.findMany({
    where: { payoutId },
    select: { orderId: true, recipientType: true },
  });
  const shopOrderIds = links
    .filter((link) => link.recipientType === "shop")
    .map((link) => link.orderId);
  const riderOrderIds = links
    .filter((link) => link.recipientType === "rider")
    .map((link) => link.orderId);
  await prisma.$transaction([
    ...(shopOrderIds.length
      ? [
          prisma.order.updateMany({
            where: { id: { in: shopOrderIds } },
            data: { shopPayoutStatus: status },
          }),
        ]
      : []),
    ...(riderOrderIds.length
      ? [
          prisma.order.updateMany({
            where: { id: { in: riderOrderIds } },
            data: { riderPayoutStatus: status },
          }),
        ]
      : []),
  ]);
}
