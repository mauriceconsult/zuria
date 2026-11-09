import { momo } from "@/lib/momo";
import { prisma } from "@/lib/prisma";
import { onPaymentConfirmed } from "@/lib/payment";
import { reconcileAttempt } from "@/lib/payments/reconcile";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get("attemptId");
  const referenceId = searchParams.get("referenceId");
  const orderId = searchParams.get("orderId");

  if (!orderId || (!attemptId && !referenceId)) {
    return new NextResponse("Missing params", { status: 400 });
  }

  if (attemptId) {
    const attempt = await prisma.paymentAttempt.findFirst({
      where: { id: attemptId, orderId },
    });
    if (!attempt) return new NextResponse("Payment attempt not found", { status: 404 });
    const status = await reconcileAttempt({ id: attempt.id });
    return NextResponse.json({ status, attemptId: attempt.id });
  }

  if (!referenceId) return new NextResponse("Missing referenceId", { status: 400 });
  const order = await prisma.order.findFirst({
    where: { id: orderId, paymentRef: referenceId },
  });
  if (!order) return new NextResponse("Payment not found", { status: 404 });

  const status = await momo.collections.checkTransactionStatus(referenceId);

  if (status.status === "SUCCESSFUL") {
    await onPaymentConfirmed(orderId, {
      paymentMethod: "mobile_money",
      paymentRef: status.financialTransactionId ?? referenceId,
    });
    return NextResponse.json({ status: "SUCCESSFUL" });
  }

  if (status.status === "FAILED") {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "failed" },
    });
    return NextResponse.json({ status: "FAILED" });
  }

  return NextResponse.json({ status: status.status });
}
