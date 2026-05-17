// lib/delivery/registry.ts

import { uberDirectProvider } from "./providers/uber-direct";
import { mockProvider }       from "./providers/mock";
import type { DeliveryProvider } from "./types";
import { safebodaProvider } from "./providers/safeboda";

export function getDeliveryProvider(): DeliveryProvider {
  const name = process.env.DELIVERY_PROVIDER ?? "mock";

  switch (name) {
    case "uber_direct": return uberDirectProvider;  // pending Uber Direct approval
    case "safeboda":    return safebodaProvider;    // live once credentials arrive
    case "mock":        return mockProvider;        // local dev + fallback
    // glovo, bolt — add here as you build them
    default:
      console.warn(`[delivery] Unknown provider "${name}", falling back to mock`);
      return mockProvider;
  }
}
