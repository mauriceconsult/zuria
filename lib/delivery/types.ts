// lib/delivery/types.ts
// Provider-agnostic delivery types.
// All delivery providers must conform to this interface.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryAddress {
  formatted: string;   // human-readable address string
  coords: LatLng;      // geocoded coordinates
}

export interface DeliveryQuoteRequest {
  shopId:      string;
  origin:      LatLng;        // shop location
  destination: DeliveryAddress;
  items?:      { name: string; quantity: number }[];
}

export interface DeliveryQuoteResponse {
  quoteId:           string;
  provider:          string;   // "uber_direct" | "sendy" | "mock" etc.
  cost:              number;   // in smallest currency unit (e.g. UGX cents)
  currency:          string;
  estimatedMinutes:  number;
  expiresAt:         string;   // ISO date — quotes expire
  raw?:              unknown;  // original provider response for debugging
}

export interface CreateDeliveryRequest {
  quoteId:      string;
  orderId:      string;
  shopId:       string;
  origin:       LatLng & { address: string; contactName: string; contactPhone: string };
  destination:  LatLng & { address: string; contactName: string; contactPhone: string };
  provider:     string;
}

export interface CreateDeliveryResponse {
  deliveryId:    string;
  trackingUrl?:  string;
  status:        string;
  provider:      string;
}

// ─── Provider interface ────────────────────────────────────────────────────────
// Every provider implements this. Add new providers by implementing this interface
// and registering them in lib/delivery/registry.ts.

export interface DeliveryProvider {
  name:        string;
  getQuote:    (req: DeliveryQuoteRequest)  => Promise<DeliveryQuoteResponse>;
  createJob:   (req: CreateDeliveryRequest) => Promise<CreateDeliveryResponse>;
  cancelJob?:  (deliveryId: string)         => Promise<void>;
}
