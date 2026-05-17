import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "@/lib/delivery/types";

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
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

export const mockProvider: DeliveryProvider = {
  name: "mock",

  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    const km = haversineKm(
      req.origin.lat,
      req.origin.lng,
      req.destination.lat,
      req.destination.lng, // ← flat now, no .coords
    );
    const cost = Math.round(3000 + km * 1500);
    return {
      quoteId: `mock_quote_${Date.now()}`,
      provider: "mock",
      cost,
      currency: "UGX",
      estimatedMinutes: Math.round(10 + km * 3),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  },

  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    return {
      deliveryId: `mock_delivery_${Date.now()}`,
      trackingUrl: `https://mock-tracking.example.com/${req.orderId}`,
      status: "pending",
      provider: "mock",
    };
  },
};
