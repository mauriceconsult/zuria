// app/dukaboda/track/[jobId]/page.tsx  (Zuria)
// Public tracking page — customer sees live delivery status
// URL: dukaboda.maxnovate.com/track/:jobId

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TrackingClient } from "./_components/tracking-client";

interface Props {
  params: Promise<{ jobId: string }>;
}

export default async function TrackingPage({ params }: Props) {
  const { jobId } = await params;

  const job = await prisma.deliveryJob.findUnique({
    where:   { id: jobId },
    include: {
      order: {
        include: { shop: true },
      },
      rider: true,
    },
  });

  if (!job) notFound();

  // Shape for client component — no sensitive data
  const trackingData = {
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
  };

  return <TrackingClient initialData={trackingData} />;
}

// Revalidate every 15 seconds for near-real-time updates
export const revalidate = 15;
