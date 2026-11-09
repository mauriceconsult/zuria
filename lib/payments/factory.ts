import { momo } from "@/lib/momo";
import { initiateMpesaCollection, verifyMpesaPayment } from "./mpesa";
import type { PaymentNetwork } from "./providers";

export interface CollectionRequest {
  amount: { value: number; currency: string };
  phoneNumber: string;
  network: PaymentNetwork;
  reference: string;
}

export interface CollectionResponse {
  success: boolean;
  transactionId: string;
  message?: string;
}

export interface PaymentVerification {
  status: "PENDING" | "COMPLETED" | "FAILED";
  receipt?: string;
  failureReason?: string;
}

export interface PaymentAdapter {
  initiateCollection: (request: CollectionRequest) => Promise<CollectionResponse>;
  verifyPayment: (
    attemptId: string,
    providerRef: string,
  ) => Promise<PaymentVerification>;
}

const adapters: Record<PaymentNetwork, PaymentAdapter> = {
  mtn: {
    async initiateCollection(request) {
      const transactionId = await momo.collections.requestToPay({
        amount: String(request.amount.value),
        currency: request.amount.currency,
        externalId: request.reference,
        payer: { partyIdType: "MSISDN", partyId: request.phoneNumber },
        payerMessage: `Payment for order ${request.reference}`,
        payeeNote: "Thank you for your purchase",
      });
      return { success: true, transactionId, message: "Approve the prompt on your phone." };
    },
    async verifyPayment(_attemptId, providerRef) {
      const response = await momo.collections.checkTransactionStatus(providerRef);
      if (response.status === "SUCCESSFUL") {
        return {
          status: "COMPLETED",
          receipt: response.financialTransactionId,
        };
      }
      if (response.status === "FAILED" || response.status === "REJECTED") {
        return {
          status: "FAILED",
          failureReason: response.reason ?? response.status,
        };
      }
      return { status: "PENDING" };
    },
  },
  mpesa: {
    initiateCollection: initiateMpesaCollection,
    verifyPayment: verifyMpesaPayment,
  },
};

export function getAdapter(network: PaymentNetwork): PaymentAdapter {
  return adapters[network];
}
