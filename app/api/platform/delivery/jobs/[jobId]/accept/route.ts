// app/api/platform/delivery/jobs/[jobId]/accept/route.ts
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const userId = await requirePlatformUser(req);
    if (!userId)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { jobId } = await params;
    const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
    if (!rider)
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });

    const job = await prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryJob.findUnique({
        where: { id: jobId },
      });
      if (!existing) throw new Error("Job not found");
      if (existing.status !== "pending") throw new Error("Job already taken");
      return tx.deliveryJob.update({
        where: { id: jobId },
        data: { riderId: rider.id, status: "accepted", acceptedAt: new Date() },
      });
    });

    await prisma.order.update({
      where: { id: job.orderId },
      data: { deliveryStatus: "accepted", deliveryRef: job.id },
    });
    return NextResponse.json(job);
  } catch (error) {
    console.error("[PLATFORM_JOB_ACCEPT]", error);
    const message = error instanceof Error ? error.message : "Internal error";
    const status =
      message === "Job not found"
        ? 404
        : message === "Job already taken"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
