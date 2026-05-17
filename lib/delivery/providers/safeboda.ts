// lib/delivery/providers/safeboda.ts
//
// SafeBoda for Business — delivery provider
// Credentials pending activation (applied via business.safeboda.com)
//
// Required env vars (add once SafeBoda sends credentials):
//   SAFEBODA_API_KEY=...
//   SAFEBODA_BASE_URL=https://api.safeboda.com        (live)
//                  or https://api-sandbox.safeboda.com (sandbox)
//   SAFEBODA_WEBHOOK_SECRET=...
//
// TODO: Confirm exact endpoint paths and request/response shapes
// from SafeBoda's API docs once account is activated. The structure
// below mirrors common delivery API conventions — adjust field names
// to match their actual spec.

import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "@/lib/delivery/types";

const BASE_URL = process.env.SAFEBODA_BASE_URL ?? "https://api.safeboda.com";
const API_KEY  = process.env.SAFEBODA_API_KEY  ?? "";

function authHeaders() {
  return {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type":  "application/json",
    // SafeBoda may use a different auth scheme (e.g. "ApiKey", "Token")
    // — adjust once docs are confirmed
  };
}

export const safebodaProvider: DeliveryProvider = {
  name: "safeboda",

  // ── Get delivery quote ───────────────────────────────────────────────
  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    // TODO: confirm endpoint — likely /v1/quotes or /v1/delivery/quote
    const res = await fetch(`${BASE_URL}/v1/quotes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        // TODO: confirm field names from SafeBoda docs
        pickup: {
          latitude:  req.origin.lat,
          longitude: req.origin.lng,
          address:   req.origin.address,
        },
        dropoff: {
          latitude:  req.destination.lat,
          longitude: req.destination.lng,
          address:   req.destination.address,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`SafeBoda quote failed: ${data.message ?? res.status}`);

    // TODO: map SafeBoda response fields to DeliveryQuoteResponse
    return {
      quoteId:          data.id          ?? data.quote_id,
      provider:         "safeboda",
      cost:             data.price       ?? data.cost ?? data.amount,
      currency:         data.currency    ?? "UGX",
      estimatedMinutes: data.eta_minutes ?? data.duration ?? 30,
      expiresAt:        data.expires_at  ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      raw:              data,
    };
  },

  // ── Create delivery job ──────────────────────────────────────────────
  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    // TODO: confirm endpoint — likely /v1/deliveries or /v1/orders
    const res = await fetch(`${BASE_URL}/v1/deliveries`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        // TODO: confirm field names from SafeBoda docs
        quote_id:    req.quoteId,
        external_id: req.orderId,      // your order ID for webhook correlation
        pickup: {
          latitude:     req.origin.lat,
          longitude:    req.origin.lng,
          address:      req.origin.address,
          contact_name: req.origin.contactName,
          contact_phone: req.origin.contactPhone,
        },
        dropoff: {
          latitude:      req.destination.lat,
          longitude:     req.destination.lng,
          address:       req.destination.address,
          contact_name:  req.destination.contactName,
          contact_phone: req.destination.contactPhone,
        },
        // SafeBoda-specific fields that may be required:
        // package_description: "E-commerce order",
        // package_value: 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`SafeBoda create failed: ${data.message ?? res.status}`);

    // TODO: map SafeBoda response fields to CreateDeliveryResponse
    return {
      deliveryId:  data.id           ?? data.delivery_id,
      trackingUrl: data.tracking_url ?? data.track_url ?? undefined,
      status:      data.status       ?? "pending",
      provider:    "safeboda",
    };
  },
};
