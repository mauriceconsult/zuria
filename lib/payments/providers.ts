export type PaymentProviderId = "mtn-momo" | "mpesa";
export type PaymentNetwork = "mtn" | "mpesa";

export interface PaymentProvider {
  id: PaymentProviderId;
  network: PaymentNetwork;
  currency: string;
  phone: {
    pattern: RegExp;
    normalize: (value: string) => string;
  };
}

const providers: Record<PaymentProviderId, PaymentProvider> = {
  "mtn-momo": {
    id: "mtn-momo",
    network: "mtn",
    currency: "UGX",
    phone: {
      pattern: /^(?:\+?256|0)?7\d{8}$/,
      normalize: (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
      },
    },
  },
  mpesa: {
    id: "mpesa",
    network: "mpesa",
    currency: "KES",
    phone: {
      pattern: /^(?:\+?254|0)?[17]\d{8}$/,
      normalize: (value) => {
        const digits = value.replace(/\D/g, "");
        return digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
      },
    },
  },
};

export function getProvider(id: string): PaymentProvider | undefined {
  return Object.prototype.hasOwnProperty.call(providers, id)
    ? providers[id as PaymentProviderId]
    : undefined;
}

export function normalizeProviderPhone(
  provider: PaymentProvider,
  phone: string,
): string | undefined {
  const compact = phone.replace(/[\s-]/g, "");
  if (!provider.phone.pattern.test(compact)) return undefined;
  return provider.phone.normalize(compact);
}
