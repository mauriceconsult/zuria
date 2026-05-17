// lib/delivery/types.ts

// ── Shared primitives ─────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

// ── Provider interface ────────────────────────────────────────────────

export interface DeliveryProvider {
  name: string;
  getQuote(req: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse>;
  createJob(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse>;
}

// ── Quote ─────────────────────────────────────────────────────────────

export interface DeliveryQuoteRequest {
  origin: LatLng & {
    address: string;
  };
  destination: LatLng & {
    address: string;
  };
}

export interface DeliveryQuoteResponse {
  quoteId:          string;
  provider:         string;
  cost:             number;
  currency:         string;
  estimatedMinutes: number;
  expiresAt:        string;
  raw?:             unknown;
}

// ── Create job ────────────────────────────────────────────────────────

export interface CreateDeliveryRequest {
  quoteId:  string;
  orderId:  string;
  shopId:   string;
  provider: string;
  origin: LatLng & {
    address:      string;
    contactName:  string;
    contactPhone: string;
  };
  destination: LatLng & {
    address:      string;
    contactName:  string;
    contactPhone: string;
  };
}

export interface CreateDeliveryResponse {
  deliveryId:   string;
  trackingUrl?: string;
  status:       string;
  provider:     string;
}
