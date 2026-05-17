// ─────────────────────────────────────────────────────────────────────────────
// Vendly backend — Custom Delivery Job endpoints
// app/api/delivery/jobs/route.ts
//
// GET  /api/delivery/jobs?status=pending   → available jobs (rider job queue)
// POST /api/delivery/jobs                  → create job when order is paid
//      (called internally by onPaymentConfirmed when provider=custom)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const jobs = await prisma.deliveryJob.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: { order: { include: { shop: true } } },
  });

  // Shape into the DeliveryJob type the rider app expects
  const shaped = jobs.map((j) => ({
    id:             j.id,
    orderId:        j.orderId,
    status:         j.status,
    pickupAddress:  j.order.shop.address ?? "",
    pickupLat:      j.order.shop.latitude ?? 0,
    pickupLng:      j.order.shop.longitude ?? 0,
    pickupName:     j.order.shop.name,
    pickupPhone:    j.order.shop.phone ?? "",
    dropoffAddress: j.order.address,
    dropoffLat:     j.order.deliveryLat ?? 0,
    dropoffLng:     j.order.deliveryLng ?? 0,
    dropoffName:    "Customer",
    dropoffPhone:   j.order.phone,
    deliveryCost:   j.deliveryCost,
    currency:       j.order.shop.currency ?? "UGX",
    createdAt:      j.createdAt.toISOString(),
    acceptedAt:     j.acceptedAt?.toISOString(),
    deliveredAt:    j.deliveredAt?.toISOString(),
  }));

  return NextResponse.json(shaped);
}

export async function POST(req: NextRequest) {
  // Internal only — called by onPaymentConfirmed, not the rider app
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, deliveryCost } = await req.json();

  const job = await prisma.deliveryJob.create({
    data: { orderId, deliveryCost, status: "pending" },
  });

  return NextResponse.json(job, { status: 201 });
}

