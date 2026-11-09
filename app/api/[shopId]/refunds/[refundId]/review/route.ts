// app/api/[shopId]/refunds/[refundId]/review/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// const BUSINESS_DAYS_TO_REFUND = 7;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ shopId: string; refundId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { shopId, refundId } = await params;
  const { status, adminNotes, sellerResponse } = await req.json();

  if (!["approved", "rejected"].includes(status)) {
    return new NextResponse("Status must be approved or rejected.", {
      status: 400,
    });
  }

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, userId },
  });
  if (!shop) return new NextResponse("Unauthorized", { status: 403 });

  const refund = await prisma.refundRequest.update({
    where: { id: refundId, shopId },
    data: {
      status,
      adminNotes,
      sellerResponse,
      resolvedAt: new Date(),
    },
    include: { order: true },
  });

  // If approved — process refund
  if (status === "approved") await processRefund(refund);

  const updatedRefund = await prisma.refundRequest.findUniqueOrThrow({
    where: { id: refund.id },
    include: { order: true },
  });
  return NextResponse.json(updatedRefund);
}

async function processRefund(refund: {
  id: string;
  orderId: string;
  order: {
    paymentMethod: string;
    paymentRef: string | null;
    phone: string;
    shopId: string;
    currency: string | null;
  };
}) {
  const refundDeadline = addBusinessDays(new Date(), 7);
  await prisma.refundRequest.update({
    where: { id: refund.id },
    data: {
      status: "awaiting_manual_refund",
      refundedAt: null,
    },
  });

  console.info("[REFUND] Approved refund requires manual processing", {
    refundId: refund.id,
    orderId: refund.orderId,
    paymentMethod: refund.order.paymentMethod,
    currency: refund.order.currency ?? "UGX",
    dueBy: refundDeadline.toISOString(),
  });
}

function addBusinessDays(date: Date, days: number): Date {
  let count = 0;
  const result = new Date(date);
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) count++; // skip weekends
  }
  return result;
}
