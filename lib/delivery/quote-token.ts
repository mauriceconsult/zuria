import { createHmac, timingSafeEqual } from "node:crypto";

export interface DeliveryQuoteClaims {
  shopId: string;
  provider: string;
  providerQuoteId: string;
  cost: number;
  currency: string;
  expiresAt: string;
  address: string;
  destination: { lat: number; lng: number };
}

function getSecret(): string {
  const secret = process.env.DELIVERY_QUOTE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DELIVERY_QUOTE_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

function signature(payload: string): Buffer {
  return createHmac("sha256", getSecret()).update(payload).digest();
}

export function signDeliveryQuote(claims: DeliveryQuoteClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyDeliveryQuote(
  token: string,
): DeliveryQuoteClaims | undefined {
  const [payload, encodedSignature, ...extra] = token.split(".");
  if (!payload || !encodedSignature || extra.length > 0) return undefined;

  const received = Buffer.from(encodedSignature, "base64url");
  const expected = signature(payload);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return undefined;
  }

  let claims: DeliveryQuoteClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as DeliveryQuoteClaims;
  } catch {
    return undefined;
  }

  if (
    typeof claims.shopId !== "string" ||
    typeof claims.provider !== "string" ||
    typeof claims.providerQuoteId !== "string" ||
    typeof claims.cost !== "number" ||
    !Number.isSafeInteger(claims.cost) ||
    claims.cost < 0 ||
    typeof claims.currency !== "string" ||
    typeof claims.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(claims.expiresAt)) ||
    Date.parse(claims.expiresAt) <= Date.now() ||
    typeof claims.address !== "string" ||
    typeof claims.destination?.lat !== "number" ||
    typeof claims.destination?.lng !== "number" ||
    !Number.isFinite(claims.destination.lat) ||
    !Number.isFinite(claims.destination.lng)
  ) {
    return undefined;
  }

  return claims;
}
