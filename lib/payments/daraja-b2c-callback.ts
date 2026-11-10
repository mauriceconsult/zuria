import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

interface DarajaB2cCallback {
  Result: {
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResultCode?: number | string;
    ResultDesc?: string;
    ResultParameters?: {
      ResultParameter?: Array<{ Key?: string; Value?: string | number }>;
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDarajaB2cCallback(value: unknown): value is DarajaB2cCallback {
  if (!isRecord(value) || !isRecord(value.Result)) return false;
  const result = value.Result;
  if (!(
    typeof result.ConversationID === "string" &&
    typeof result.OriginatorConversationID === "string" &&
    (typeof result.ResultCode === "number" ||
      typeof result.ResultCode === "string")
  )) {
    return false;
  }
  if (result.ResultParameters == null) return true;
  if (!isRecord(result.ResultParameters)) return false;
  const parameters = result.ResultParameters.ResultParameter;
  return (
    parameters == null ||
    (Array.isArray(parameters) &&
      parameters.every(
        (item) =>
          isRecord(item) &&
          (item.Key == null || typeof item.Key === "string") &&
          (item.Value == null ||
            typeof item.Value === "string" ||
            typeof item.Value === "number"),
      ))
  );
}

export function isAuthorizedDarajaB2cCallback(url: URL): boolean {
  const expected = process.env.DARAJA_B2C_CALLBACK_TOKEN;
  const received = url.searchParams.get("token");
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function handleDarajaB2cCallback(
  payload: unknown,
  timedOut = false,
): Promise<"NOT_FOUND" | "UPDATED" | "ALREADY_FINAL"> {
  if (!isDarajaB2cCallback(payload)) {
    throw new Error("Incomplete Daraja B2C callback");
  }
  const result = payload.Result;

  const disbursement = await prisma.disbursement.findFirst({
    where: {
      provider: "mpesa",
      providerConversationId: result.ConversationID,
      providerOriginatorId: result.OriginatorConversationID,
    },
  });
  if (!disbursement) return "NOT_FOUND";
  if (!["PROCESSING", "UNKNOWN"].includes(disbursement.momoStatus)) {
    return "ALREADY_FINAL";
  }

  const parameters = result.ResultParameters?.ResultParameter ?? [];
  const parameter = (key: string) =>
    parameters.find((item) => item.Key === key)?.Value;
  const succeeded = !timedOut && Number(result.ResultCode) === 0;
  const status = timedOut ? "UNKNOWN" : succeeded ? "SUCCESSFUL" : "FAILED";
  const update = await prisma.disbursement.updateMany({
    where: {
      id: disbursement.id,
      momoStatus: { in: ["PROCESSING", "UNKNOWN"] },
    },
    data: {
      momoStatus: status,
      providerConversationId: result.ConversationID,
      providerOriginatorId: result.OriginatorConversationID,
      receipt: parameter("TransactionReceipt")?.toString(),
      receiverName: parameter("ReceiverPartyPublicName")?.toString(),
      failureReason: succeeded
        ? null
        : (result.ResultDesc ?? (timedOut ? "Daraja payout timed out" : "Payout failed"))
            .slice(0, 500),
      ...(succeeded && { completedAt: new Date() }),
    },
  });
  if (!update.count) return "ALREADY_FINAL";

  await prisma.order.update({
    where: { id: disbursement.orderId },
    data: {
      riderPayoutStatus: timedOut
        ? "unknown"
        : succeeded
          ? "paid"
          : "failed",
    },
  });
  return "UPDATED";
}
