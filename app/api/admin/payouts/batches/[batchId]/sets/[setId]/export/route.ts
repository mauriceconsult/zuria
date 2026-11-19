import { prisma } from "@/lib/prisma";
import { requirePayoutAdmin } from "@/lib/payouts/admin";
import { validatePayoutRecipient } from "@/lib/payouts/ledger";
import {
  buildSafaricomVcf,
  getNairobiDateKey,
  nairobiDateStart,
  SAFARICOM_MAX_DAILY_KES,
} from "@/lib/payouts/safaricom";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string; setId: string }> },
) {
  const admin = await requirePayoutAdmin();
  if (admin.response) return admin.response;
  if (process.env.PAYOUTS_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Safaricom payout exports are disabled by PAYOUTS_ENABLED." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A request body is required." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("otherMoneySentToday" in body) ||
    typeof body.otherMoneySentToday !== "number" ||
    !Number.isSafeInteger(body.otherMoneySentToday) ||
    body.otherMoneySentToday < 0 ||
    body.otherMoneySentToday > SAFARICOM_MAX_DAILY_KES
  ) {
    return NextResponse.json(
      {
        error:
          "otherMoneySentToday is required as a whole KES amount between 0 and 500,000.",
      },
      { status: 400 },
    );
  }
  const otherMoneySentToday = body.otherMoneySentToday;

  const { batchId, setId } = await params;
  const set = await prisma.payoutSet.findFirst({
    where: { id: setId, batchId },
    include: { batch: true, payouts: { orderBy: { recipientId: "asc" } } },
  });
  if (!set) return NextResponse.json({ error: "Payout set not found." }, { status: 404 });
  if (
    !["APPROVED", "SENDING"].includes(set.batch.status) ||
    !set.batch.approvedAt
  ) {
    return NextResponse.json(
      { error: "Only an approved payout batch can be exported." },
      { status: 409 },
    );
  }
  if (set.status !== "PENDING" || set.exportedAt) {
    return NextResponse.json(
      { error: "This payout set has already been exported or is no longer pending." },
      { status: 409 },
    );
  }
  const today = getNairobiDateKey();
  if (set.scheduledDate.toISOString().slice(0, 10) !== today) {
    return NextResponse.json(
      { error: `This set is scheduled for Nairobi date ${set.scheduledDate.toISOString().slice(0, 10)}.` },
      { status: 409 },
    );
  }
  if (
    set.payouts.length < 1 ||
    set.payouts.length > 5 ||
    set.payouts.some(
      (payout) =>
        payout.currency !== "KES" ||
        payout.provider !== "mpesa" ||
        payout.status !== "BATCHED" ||
        !["shop", "rider"].includes(payout.recipientType),
    )
  ) {
    return NextResponse.json(
      { error: "The set contains an invalid payout state, currency, or provider." },
      { status: 409 },
    );
  }
  const setTotal = set.payouts.reduce(
    (total, payout) => total + payout.amount.toNumber(),
    0,
  );
  if (setTotal !== set.totalAmount.toNumber()) {
    return NextResponse.json(
      { error: "Set total does not match the payout ledger." },
      { status: 409 },
    );
  }

  const dailySets = await prisma.payoutSet.findMany({
    where: { scheduledDate: nairobiDateStart(today) },
    select: { totalAmount: true },
  });
  const scheduledToday = dailySets.reduce(
    (total, dailySet) => total + dailySet.totalAmount.toNumber(),
    0,
  );
  if (
    scheduledToday + otherMoneySentToday >
    SAFARICOM_MAX_DAILY_KES
  ) {
    return NextResponse.json(
      {
        error: `Scheduled Zuria sets (${scheduledToday}) plus other money already sent today (${otherMoneySentToday}) exceed the KES 500,000 Nairobi-day limit.`,
      },
      { status: 409 },
    );
  }

  for (const payout of set.payouts) {
    const problem = await validatePayoutRecipient(payout);
    if (problem) {
      console.warn("[PAYOUT] VCF export blocked by recipient validation", {
        payoutId: payout.id,
        reason: problem,
      });
      return NextResponse.json(
        { error: `Payout ${payout.id} requires manual review: ${problem}` },
        { status: 409 },
      );
    }
  }

  const recipientIds = [...new Set(set.payouts.map((payout) => payout.recipientId))];
  const [shops, riders] = await Promise.all([
    prisma.shop.findMany({
      where: {
        id: {
          in: set.payouts
            .filter((payout) => payout.recipientType === "shop")
            .map((payout) => payout.recipientId),
        },
      },
      select: { id: true, name: true },
    }),
    prisma.rider.findMany({
      where: {
        id: {
          in: set.payouts
            .filter((payout) => payout.recipientType === "rider")
            .map((payout) => payout.recipientId),
        },
      },
      select: { id: true, name: true },
    }),
  ]);
  const names = new Map([
    ...shops.map((shop) => [shop.id, shop.name] as const),
    ...riders.map((rider) => [rider.id, rider.name] as const),
  ]);
  const missingName = recipientIds.find((id) => !names.has(id));
  if (missingName) {
    return NextResponse.json(
      { error: `Recipient ${missingName} no longer exists.` },
      { status: 409 },
    );
  }

  let vcf: string;
  try {
    vcf = buildSafaricomVcf({
      batchRef: set.batchId.slice(0, 8).toUpperCase(),
      setNo: set.setNo,
      recipients: set.payouts.map((payout) => ({
        recipientType: payout.recipientType === "shop" ? "shop" : "rider",
        recipientName: names.get(payout.recipientId)!,
        phone: payout.phone,
        amount: payout.amount.toNumber(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build VCF." },
      { status: 400 },
    );
  }

  const exportedAt = new Date();
  const claimed = await prisma.payoutSet.updateMany({
    where: { id: set.id, batchId, status: "PENDING", exportedAt: null },
    data: {
      exportedAt,
      exportedBy: admin.userId!,
      otherMoneySentToday,
    },
  });
  if (claimed.count !== 1) {
    return NextResponse.json(
      { error: "This set changed before export; it cannot be exported again." },
      { status: 409 },
    );
  }

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="zuria-${set.batchId.slice(0, 8)}-set-${set.setNo}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}
