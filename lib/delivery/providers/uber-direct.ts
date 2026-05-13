// lib/delivery/providers/uber-direct.ts

import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "../types";

const BASE_URL = "https://api.uber.com/v1/eats/deliveries";

async function getUberToken(): Promise<string> {
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
  return data.access_token;
}

export const uberDirectProvider: DeliveryProvider = {
  name: "uber_direct",

  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    const token = await getUberToken();

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pickup_address: JSON.stringify({
          street_address: [req.destination.formatted],
          city:           "Kampala",
          state:          "Central",
          zip_code:       "256",
          country:        "UG",
          latitude:       req.origin.lat,
          longitude:      req.origin.lng,
        }),
        dropoff_address: JSON.stringify({
          street_address: [req.destination.formatted],
          city:           "Kampala",
          state:          "Central",
          zip_code:       "256",
          country:        "UG",
          latitude:       req.destination.coords.lat,
          longitude:      req.destination.coords.lng,
        }),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber quote failed: ${data.message}`);

    return {
      quoteId:          data.id,
      provider:         "uber_direct",
      cost:             data.fee,
      currency:         data.currency_code ?? "UGX",
      estimatedMinutes: Math.round((data.duration ?? 1800) / 60),
      expiresAt:        data.expires ?? new Date(Date.now() + 10 * 60000).toISOString(),
      raw:              data,
    };
  },

  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    const token = await getUberToken();

    const res = await fetch(`${BASE_URL}`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quote_id: req.quoteId,
        pickup_name:    req.origin.contactName,
        pickup_address: JSON.stringify({
          street_address: [req.origin.address],
          latitude:       req.origin.lat,
          longitude:      req.origin.lng,
        }),
        pickup_phone_number:   req.origin.contactPhone,
        dropoff_name:          req.destination.contactName,
        dropoff_address: JSON.stringify({
          street_address: [req.destination.address],
          latitude:       req.destination.lat,
          longitude:      req.destination.lng,
        }),
        dropoff_phone_number:  req.destination.contactPhone,
        manifest_total_value:  100,
        external_store_id:     req.shopId,
        external_delivery_id:  req.orderId,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber create failed: ${data.message}`);

    return {
      deliveryId:  data.id,
      trackingUrl: data.tracking_url,
      status:      data.status,
      provider:    "uber_direct",
    };
  },
};
