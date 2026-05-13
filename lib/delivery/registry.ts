// lib/delivery/registry.ts
// Select delivery provider via DELIVERY_PROVIDER env var.
// Add new providers by importing and registering them here.
//
// .env:
//   DELIVERY_PROVIDER=uber_direct   # production
//   DELIVERY_PROVIDER=mock          # development / testing

import type { DeliveryProvider } from "./types";
import { uberDirectProvider } from "./providers/uber-direct";
import { mockProvider }        from "./providers/mock";

const providers: Record<string, DeliveryProvider> = {
  uber_direct: uberDirectProvider,
  mock:        mockProvider,
};

export function getDeliveryProvider(): DeliveryProvider {
  const name = process.env.DELIVERY_PROVIDER ?? "mock";
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Unknown delivery provider: "${name}". ` +
      `Available: ${Object.keys(providers).join(", ")}`
    );
  }
  return provider;
}
