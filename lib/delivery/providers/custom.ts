// lib/delivery/providers/custom.ts
//
// Vendly's own delivery network.
// Instead of calling a third-party API, this posts a DeliveryJob
// to our own database. Rider app picks it up via polling.

import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "@/lib/delivery/types";
import { prisma } from "@/lib/prisma";

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pricing: UGX 3,000 base + UGX 1,200/km
// Adjust as you learn real costs from SafeBoda/Uber data
const BASE_FARE  = 3_000;
const PER_KM     = 1_200;

export const customProvider: DeliveryProvider = {
  name: "custom",

  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    const km = haversineKm(
      req.origin.lat, req.origin.lng,
      req.destination.lat, req.destination.lng,
    );

    const cost             = Math.round(BASE_FARE + km * PER_KM);
    const estimatedMinutes = Math.round(10 + km * 4); // ~15km/h average in Kampala

    return {
      quoteId:          `custom_quote_${Date.now()}`,
      provider:         "custom",
      cost,
      currency:         "UGX",
      estimatedMinutes,
      expiresAt:        new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  },

  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    // Write directly to DB — no external API call needed
    const job = await prisma.deliveryJob.create({
      data: {
        orderId:      req.orderId,
        deliveryCost: 0, // will be set from the quote stored on the order
        status:       "pending",
      },
    });

    return {
      deliveryId: job.id,
      status:     "pending",
      provider:   "custom",
      // No trackingUrl yet — future: vendly.maxnovate.com/track/:jobId
    };
  },
};
