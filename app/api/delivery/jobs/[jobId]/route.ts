// app/api/delivery/jobs/[jobId]/track/route.ts  (Zuria)
// Public endpoint — returns safe tracking data for customer tracking page

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = await prisma.deliveryJob.findUnique({
    where:   { id: jobId },
    include: {
      order: { include: { shop: true } },
      rider: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return only safe public fields — no order value, no phone numbers
  return NextResponse.json({
    jobId:          job.id,
    status:         job.status,
    shopName:       job.order.shop.name,
    shopAddress:    job.order.shop.address ?? "",
    dropoffAddress: job.order.address,
    riderName:      job.rider?.name ?? null,
    riderVehicle:   job.rider?.vehicleType ?? null,
    acceptedAt:     job.acceptedAt?.toISOString() ?? null,
    deliveredAt:    job.deliveredAt?.toISOString() ?? null,
    createdAt:      job.createdAt.toISOString(),
  });
}
