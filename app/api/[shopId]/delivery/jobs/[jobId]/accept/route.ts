// ─────────────────────────────────────────────────────────────────────────────
// app/api/delivery/jobs/[jobId]/accept/route.ts
//
// PATCH /api/delivery/jobs/:jobId/accept
// Atomically claims the job for this rider (only if still pending).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;

  const rider = await prisma.rider.findUnique({ where: { clerkId: userId } });
  if (!rider) return NextResponse.json({ error: "Rider not found" }, { status: 404 });

  // Use a transaction so two riders can't claim the same job simultaneously
  const job = await prisma.$transaction(async (tx) => {
    const existing = await tx.deliveryJob.findUnique({ where: { id: jobId } });

    if (!existing) throw new Error("Job not found");
    if (existing.status !== "pending") throw new Error("Job already taken");

    return tx.deliveryJob.update({
      where: { id: jobId },
      data: {
        riderId:    rider.id,
        status:     "accepted",
        acceptedAt: new Date(),
      },
    });
  });

  // Also update the parent order's deliveryStatus
  await prisma.order.update({
    where: { id: job.orderId },
    data: { deliveryStatus: "accepted", deliveryRef: job.id },
  });

  return NextResponse.json(job);
}




