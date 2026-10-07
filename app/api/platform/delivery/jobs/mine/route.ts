// app/api/platform/delivery/jobs/mine/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const userId = await requirePlatformUser(req);
  if (!userId)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider)
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const jobs = await prisma.deliveryJob.findMany({
    where: { riderId: rider.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { order: { include: { shop: true } } },
  });

  const shaped = jobs.map((j) => ({
    id: j.id,
    orderId: j.orderId,
    status: j.status,
    pickupAddress: j.order.shop.address ?? "",
    pickupLat: j.order.shop.latitude ?? 0,
    pickupLng: j.order.shop.longitude ?? 0,
    pickupName: j.order.shop.name,
    pickupPhone: j.order.shop.phone ?? "",
    dropoffAddress: j.order.address,
    dropoffLat: j.order.deliveryLat ?? 0,
    dropoffLng: j.order.deliveryLng ?? 0,
    dropoffName: "Customer",
    dropoffPhone: j.order.phone,
    deliveryCost: j.deliveryCost,
    currency: j.order.shop.currency ?? "UGX",
    createdAt: j.createdAt.toISOString(),
    acceptedAt: j.acceptedAt?.toISOString(),
    deliveredAt: j.deliveredAt?.toISOString(),
  }));

  return NextResponse.json(shaped);
}
