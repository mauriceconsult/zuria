// app/api/[shopId]/delivery/jobs/[jobId]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const VALID_TRANSITIONS: Record<string, string[]> = {
  accepted: ["picking_up", "cancelled"],
  picking_up: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered", "failed"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string; jobId: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const { status, lat, lng } = await req.json();

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider)
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });

  const job = await prisma.deliveryJob.findUnique({ where: { id: jobId } });
  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.riderId !== rider.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed = VALID_TRANSITIONS[job.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${job.status} to ${status}` },
      { status: 422 },
    );
  }

  const isDelivered = status === "delivered";

  const updated = await prisma.deliveryJob.update({
    where: { id: jobId },
    data: {
      status,
      ...(isDelivered && { deliveredAt: new Date() }),
      ...(lat != null && lng != null && { lastLat: lat, lastLng: lng }),
    },
  });

  await prisma.order.update({
    where: { id: job.orderId },
    data: {
      deliveryStatus: status,
      ...(isDelivered && { deliveredAt: new Date() }),
    },
  });

  return NextResponse.json(updated);
}
