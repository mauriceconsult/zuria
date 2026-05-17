// app/api/webhooks/delivery/safeboda/route.ts
//
// SafeBoda webhook — receives delivery status updates
//
// Register this URL in the SafeBoda Business portal once activated:
//   https://vendly.maxnovate.com/api/webhooks/delivery/safeboda
//
// TODO: Confirm:
//   1. How SafeBoda signs webhooks (header name + HMAC or plain secret)
//   2. Exact payload shape and status string values
//   3. Whether they send a delivery_id or external_id for correlation

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Map SafeBoda statuses → Vendly internal deliveryStatus
// TODO: replace with actual SafeBoda status strings once docs confirmed
const STATUS_MAP: Record<string, string> = {
  pending:         "pending",
  accepted:        "pending",       // rider accepted the job
  picking_up:      "picking_up",    // rider en route to shop
  picked_up:       "picked_up",     // rider collected package
  in_transit:      "in_transit",    // rider heading to customer
  delivered:       "delivered",
  cancelled:       "cancelled",
  failed:          "failed",
};

function verifySignature(body: string, header: string | null): boolean {
  const secret = process.env.SAFEBODA_WEBHOOK_SECRET;
  if (!secret) {
    // TODO: remove this bypass once secret is confirmed and set in env
    console.warn("[safeboda webhook] SAFEBODA_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  if (!header) return false;

  // TODO: confirm SafeBoda's signing method — adjusting once docs confirmed
  // Common pattern: HMAC-SHA256 of raw body, compared against header value
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(header),
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // TODO: confirm SafeBoda's signature header name
  const signature = req.headers.get("x-safeboda-signature")
    ?? req.headers.get("x-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    console.error("[safeboda webhook] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // TODO: confirm SafeBoda payload shape
  // Assuming: { external_id, delivery_id, status, tracking_url? }
  const externalId   = body.external_id   as string | undefined; // your orderId
  const deliveryId   = body.delivery_id   as string | undefined; // SafeBoda's ID
  const rawStatus    = body.status        as string | undefined;
  const trackingUrl  = body.tracking_url  as string | undefined;

  if (!externalId || !rawStatus) {
    console.error("[safeboda webhook] Missing external_id or status", body);
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const internalStatus = STATUS_MAP[rawStatus] ?? rawStatus;

  await prisma.order.updateMany({
    where: { id: externalId },
    data: {
      deliveryStatus: internalStatus,
      ...(deliveryId   && { deliveryRef:         deliveryId }),
      ...(trackingUrl  && { deliveryTrackingUrl:  trackingUrl }),
      ...(internalStatus === "delivered" && { deliveredAt: new Date() }),
    },
  });

  console.log(`[safeboda webhook] Order ${externalId} → ${internalStatus}`);
  return NextResponse.json({ received: true });
}
