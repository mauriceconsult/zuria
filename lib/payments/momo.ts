// lib/payments/momo.ts

export interface MoMoWebhookPayload {
  referenceId: string;
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "CANCELLED";

  financialTransactionId?: string;
  externalId?: string;
  amount?: string;
  currency?: string;
  payer?: {
    partyIdType: string;
    partyId: string;
  };

  payee?: {
    partyIdType: string;
    partyId: string;
  };

  reason?: string;

  [key: string]: unknown;
}
