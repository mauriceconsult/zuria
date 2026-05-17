import type {
  DeliveryProvider,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  CreateDeliveryRequest,
  CreateDeliveryResponse,
} from "@/lib/delivery/types";

const CUSTOMER_ID = process.env.UBER_CUSTOMER_ID!;
const BASE = `https://api.uber.com/v1/customers/${CUSTOMER_ID}`;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getUberToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const res = await fetch("https://login.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.UBER_CLIENT_ID!,
      client_secret: process.env.UBER_CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Uber auth failed: ${data.message}`);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// Uber Direct expects address as a JSON string
function buildAddress(address: string, lat: number, lng: number): string {
  return JSON.stringify({
    street_address: [address],
    city: "Kampala",
    state: "Central",
    zip_code: "256",
    country: "UG",
    latitude: lat,
    longitude: lng,
  });
}

export const uberDirectProvider: DeliveryProvider = {
  name: "uber_direct",

  async getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse> {
    const token = await getUberToken();

    const res = await fetch(`${BASE}/delivery_quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pickup_address: buildAddress(
          req.origin.address,
          req.origin.lat,
          req.origin.lng,
        ),
        dropoff_address: buildAddress(
          req.destination.address,
          req.destination.lat,
          req.destination.lng,
        ),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber quote failed: ${data.message}`);

    return {
      quoteId: data.id,
      provider: "uber_direct",
      cost: data.fee,
      currency: data.currency_code ?? "UGX",
      estimatedMinutes: Math.round((data.duration ?? 1800) / 60),
      expiresAt:
        data.expires ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      raw: data,
    };
  },

  async createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
    const token = await getUberToken();

    const res = await fetch(`${BASE}/deliveries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quote_id: req.quoteId,
        pickup_name: req.origin.contactName,
        pickup_address: buildAddress(
          req.origin.address,
          req.origin.lat,
          req.origin.lng,
        ),
        pickup_phone_number: req.origin.contactPhone,
        dropoff_name: req.destination.contactName,
        dropoff_address: buildAddress(
          req.destination.address,
          req.destination.lat,
          req.destination.lng,
        ),
        dropoff_phone_number: req.destination.contactPhone,
        manifest_total_value: 100,
        external_store_id: req.shopId,
        external_delivery_id: req.orderId,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Uber create failed: ${data.message}`);

    return {
      deliveryId: data.id,
      trackingUrl: data.tracking_url,
      status: data.status,
      provider: "uber_direct",
    };
  },
};
