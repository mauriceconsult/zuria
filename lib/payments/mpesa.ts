import type {
  CollectionRequest,
  CollectionResponse,
  PaymentVerification,
} from "./factory";

interface DarajaConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

function getConfig(): DarajaConfig {
  const {
    DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke",
    DARAJA_CONSUMER_KEY,
    DARAJA_CONSUMER_SECRET,
    DARAJA_SHORTCODE,
    DARAJA_PASSKEY,
    DARAJA_CALLBACK_URL,
  } = process.env;

  if (
    !DARAJA_CONSUMER_KEY ||
    !DARAJA_CONSUMER_SECRET ||
    !DARAJA_SHORTCODE ||
    !DARAJA_PASSKEY ||
    !DARAJA_CALLBACK_URL
  ) {
    throw new Error("Missing Daraja configuration");
  }

  return {
    baseUrl: DARAJA_BASE_URL.replace(/\/+$/, ""),
    consumerKey: DARAJA_CONSUMER_KEY,
    consumerSecret: DARAJA_CONSUMER_SECRET,
    shortcode: DARAJA_SHORTCODE,
    passkey: DARAJA_PASSKEY,
    callbackUrl: DARAJA_CALLBACK_URL,
  };
}

async function getAccessToken(config: DarajaConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64");
  const response = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: string;
    errorMessage?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new Error(body.errorMessage ?? "Could not obtain Daraja access token");
  }

  const expiresIn = Number(body.expires_in ?? 3600);
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return cachedToken.value;
}

async function postJson<T>(
  url: string,
  token: string,
  payload: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as T & {
    errorMessage?: string;
    ResponseDescription?: string;
  };
  if (!response.ok || body.errorMessage) {
    throw new Error(
      body.errorMessage ??
        body.ResponseDescription ??
        `Daraja request failed (${response.status})`,
    );
  }
  return body;
}

function darajaTimestamp(date = new Date()): string {
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`;
}

function stkPassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export async function initiateMpesaCollection(
  request: CollectionRequest,
): Promise<CollectionResponse> {
  const config = getConfig();
  const token = await getAccessToken(config);
  const timestamp = darajaTimestamp();
  const response = await postJson<{
    ResponseCode?: string;
    ResponseDescription?: string;
    CheckoutRequestID?: string;
    errorMessage?: string;
  }>(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, token, {
    BusinessShortCode: config.shortcode,
    Password: stkPassword(config.shortcode, config.passkey, timestamp),
    Timestamp: timestamp,
    TransactionType: process.env.DARAJA_TRANSACTION_TYPE ?? "CustomerPayBillOnline",
    Amount: request.amount.value,
    PartyA: request.phoneNumber,
    PartyB: config.shortcode,
    PhoneNumber: request.phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: request.reference.slice(0, 12),
    TransactionDesc: "Marketplace order",
  });

  if (response.ResponseCode !== "0" || !response.CheckoutRequestID) {
    throw new Error(response.ResponseDescription ?? "Daraja rejected the STK push");
  }
  return {
    success: true,
    transactionId: response.CheckoutRequestID,
    message: response.ResponseDescription ?? "Approve the prompt on your phone.",
  };
}

export async function verifyMpesaPayment(
  _attemptId: string,
  providerRef: string,
): Promise<PaymentVerification> {
  const config = getConfig();
  const token = await getAccessToken(config);
  const timestamp = darajaTimestamp();
  const response = await postJson<{
    ResponseCode?: string;
    ResponseDescription?: string;
    ResultCode?: number | string;
    ResultDesc?: string;
    CallbackMetadata?: {
      Item?: Array<{ Name?: string; Value?: string | number }>;
    };
  }>(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, token, {
    BusinessShortCode: config.shortcode,
    Password: stkPassword(config.shortcode, config.passkey, timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: providerRef,
  });

  if (response.ResponseCode && response.ResponseCode !== "0") {
    throw new Error(response.ResponseDescription ?? "Daraja payment query failed");
  }
  if (response.ResultCode === 0 || response.ResultCode === "0") {
    const receipt = response.CallbackMetadata?.Item?.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;
    return {
      status: "COMPLETED",
      receipt: receipt == null ? undefined : String(receipt),
    };
  }
  if (response.ResultCode != null) {
    return {
      status: "FAILED",
      failureReason: response.ResultDesc ?? response.ResponseDescription,
    };
  }
  return { status: "PENDING" };
}

export interface MpesaDisbursementResponse {
  conversationId: string;
  originatorConversationId: string;
}

export async function initiateMpesaDisbursement(input: {
  amount: number;
  phoneNumber: string;
  reference: string;
}): Promise<MpesaDisbursementResponse> {
  const {
    DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke",
    DARAJA_CONSUMER_KEY,
    DARAJA_CONSUMER_SECRET,
    DARAJA_B2C_SHORTCODE,
    DARAJA_B2C_INITIATOR_NAME,
    DARAJA_B2C_SECURITY_CREDENTIAL,
    DARAJA_B2C_RESULT_URL,
    DARAJA_B2C_TIMEOUT_URL,
    DARAJA_B2C_CALLBACK_TOKEN,
  } = process.env;

  if (
    !DARAJA_CONSUMER_KEY ||
    !DARAJA_CONSUMER_SECRET ||
    !DARAJA_B2C_SHORTCODE ||
    !DARAJA_B2C_INITIATOR_NAME ||
    !DARAJA_B2C_SECURITY_CREDENTIAL ||
    !DARAJA_B2C_RESULT_URL ||
    !DARAJA_B2C_TIMEOUT_URL ||
    !DARAJA_B2C_CALLBACK_TOKEN
  ) {
    throw new Error("Missing Daraja B2C configuration");
  }

  const callbackUrls = [DARAJA_B2C_RESULT_URL, DARAJA_B2C_TIMEOUT_URL];
  for (const callbackUrl of callbackUrls) {
    const url = new URL(callbackUrl);
    if (
      url.protocol !== "https:" ||
      url.searchParams.get("token") !== DARAJA_B2C_CALLBACK_TOKEN
    ) {
      throw new Error(
        "Daraja B2C callback URLs must use HTTPS and include the configured callback token",
      );
    }
  }

  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !/^254[17]\d{8}$/.test(input.phoneNumber)
  ) {
    throw new Error("Invalid Daraja B2C amount or recipient phone number");
  }

  const config: DarajaConfig = {
    baseUrl: DARAJA_BASE_URL.replace(/\/+$/, ""),
    consumerKey: DARAJA_CONSUMER_KEY,
    consumerSecret: DARAJA_CONSUMER_SECRET,
    shortcode: DARAJA_B2C_SHORTCODE,
    passkey: "",
    callbackUrl: "",
  };
  const token = await getAccessToken(config);
  const response = await postJson<{
    ResponseCode?: string;
    ResponseDescription?: string;
    ConversationID?: string;
    OriginatorConversationID?: string;
    errorMessage?: string;
  }>(
    `${config.baseUrl}/mpesa/b2c/v1/paymentrequest`,
    token,
    {
      InitiatorName: DARAJA_B2C_INITIATOR_NAME,
      SecurityCredential: DARAJA_B2C_SECURITY_CREDENTIAL,
      CommandID: process.env.DARAJA_B2C_COMMAND_ID ?? "BusinessPayment",
      Amount: input.amount,
      PartyA: DARAJA_B2C_SHORTCODE,
      PartyB: input.phoneNumber,
      Remarks: input.reference.slice(0, 100),
      QueueTimeOutURL: DARAJA_B2C_TIMEOUT_URL,
      ResultURL: DARAJA_B2C_RESULT_URL,
      Occasion: "Dukaboda rider payout",
    },
  );

  if (
    response.ResponseCode !== "0" ||
    !response.ConversationID ||
    !response.OriginatorConversationID
  ) {
    throw new Error(
      response.ResponseDescription ?? "Daraja rejected the B2C payout request",
    );
  }

  return {
    conversationId: response.ConversationID,
    originatorConversationId: response.OriginatorConversationID,
  };
}
