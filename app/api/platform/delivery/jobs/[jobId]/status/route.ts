// app/api/platform/delivery/jobs/[jobId]/status/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_TRANSITIONS: Record<string, string[]> = {
  accepted: ["picking_up", "cancelled"],
  picking_up: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered", "failed"],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

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
  } catch (error) {
    console.error("[PLATFORM_JOB_STATUS]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
