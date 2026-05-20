// lib/delivery/providers/uber-direct.ts

import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "@/lib/delivery/types";

const BASE        = "https://api.uber.com/v1";
const CUSTOMER_ID = process.env.UBER_CUSTOMER_ID!;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getUberToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const res = await fetch("https://login.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.UBER_CLIENT_ID!,
      client_secret: process.env.UBER_CLIENT_SECRET!,
      grant_type:    "client_credentials",
      scope:         "eats.deliveries",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Uber auth failed: ${data.message}`);
  cachedToken = {
    value:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// Uber requires address as a JSON string with this exact shape
function buildAddress(address: string, city = "Kampala", state = "Central"): string {
  return JSON.stringify({
    street_address: [address],
    city,
    state,
    zip_code: "256",
    country:  "UG",
  });
}

// Uber requires E.164 format: +256XXXXXXXXX
function formatPhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  // Strip leading 0 and prepend Uganda code
  return `+256${phone.replace(/^0/, "")}`;
}

export const uberDirectProvider: DeliveryProvider = {
  name: "uber_direct",

  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    const token = await getUberToken();

    const res = await fetch(
      `${BASE}/customers/${CUSTOMER_ID}/delivery_quotes`,
      {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_address:    buildAddress(req.origin.address),
          pickup_latitude:   req.origin.lat,       // ← separate field per spec
          pickup_longitude:  req.origin.lng,
          dropoff_address:   buildAddress(req.destination.address),
          dropoff_latitude:  req.destination.lat,
          dropoff_longitude: req.destination.lng,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber quote failed: ${data.message ?? res.status}`);

    return {
      quoteId:          data.id,
      provider:         "uber_direct",
      cost:             data.fee,
      currency:         data.currency_code ?? "UGX",
      estimatedMinutes: Math.round((data.duration ?? 1800) / 60),
      expiresAt:        data.expires ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      raw:              data,
    };
  },

  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    const token = await getUberToken();

    const res = await fetch(
      `${BASE}/customers/${CUSTOMER_ID}/deliveries`,
      {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote_id:             req.quoteId,

          // Pickup — per spec these are all flat fields
          pickup_name:          req.origin.contactName,
          pickup_business_name: req.origin.contactName,
          pickup_address:       buildAddress(req.origin.address),
          pickup_latitude:      req.origin.lat,
          pickup_longitude:     req.origin.lng,
          pickup_phone_number:  formatPhone(req.origin.contactPhone),

          // Dropoff
          dropoff_name:         req.destination.contactName,
          dropoff_address:      buildAddress(req.destination.address),
          dropoff_latitude:     req.destination.lat,
          dropoff_longitude:    req.destination.lng,
          dropoff_phone_number: formatPhone(req.destination.contactPhone),

          // Order metadata
          manifest_total_value: 100,           // cents — update with actual order value
          external_store_id:    req.shopId,    // must match quote if used there
          external_id:          req.orderId,   // your order ID for webhook correlation
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber create failed: ${data.message ?? res.status}`);

    return {
      deliveryId:  data.id,
      trackingUrl: data.tracking_url,
      status:      data.status,
      provider:    "uber_direct",
    };
  },
};