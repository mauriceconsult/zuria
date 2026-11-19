# Zuria

Maxnovate's e-commerce marketplace. Shop owners list products; customers browse
and pay via MTN MoMo; Dukaboda handles last-mile delivery. Vendly is the
white-label storefront skin built on top of Zuria's infrastructure.

Deployed at: https://zuria.maxnovate.com
Dukaboda subdomain: https://dukaboda.maxnovate.com (Vercel rewrite → Zuria)
MoMo webhook: https://zuria.maxnovate.com/api/webhook/momo

---

## Stack

- Framework: Next.js (App Router), TypeScript
- Auth: Clerk (`@clerk/nextjs`) — Dukaboda app shares this same Clerk instance
- Database: Prisma ORM → Neon PostgreSQL
- Payments: MTN MoMo and Safaricom Daraja collections; KES payouts use a manual Safaricom VCF workflow
- Delivery: multi-provider registry (Dukaboda custom, SafeBoda, mock)
- Deploy: Vercel

---

## Key commands

```bash
bun dev                          # local dev server (port 4000 typically)
bun run build                    # production build
bunx prisma migrate dev          # create + apply migration (dev)
bunx prisma migrate deploy       # apply migrations (production)
bunx prisma generate             # regenerate Prisma client
bunx prisma db push              # push schema without migration file (dev only)
```

---

## Architecture

### Order payment flow

```
Customer checkout
  → POST /api/[shopId]/checkout/momo with providerId (mtn-momo or mpesa)
  → verifies the signed delivery quote and uses its server-signed amount
  → creates Order + PaymentAttempt; sends MTN RequestToPay or Daraja STK Push
  → providerRef is MTN X-Reference-Id or Daraja CheckoutRequestID
  → callbacks/status checks reconcile the PaymentAttempt
  → onPaymentConfirmed() marks the order paid exactly once
  → Order.isPaid = true, products archived
  → eligible UGX shop disbursements continue through MTN MoMo
```

Daraja callbacks are received at `POST /api/webhook/daraja`; MTN callbacks continue
at `POST /api/webhook/momo`. Payment collection supports UGX/MTN MoMo and KES/Safaricom M-Pesa. Rider
payouts use MTN MoMo for UGX after delivery confirmation. KES payouts are
processed through the manual Safaricom Send to Many workflow; Zuria does not
submit Daraja B2C payout requests.
Delivery quote signing requires `DELIVERY_QUOTE_SECRET` (at least 32 characters).

### Rider payout providers

- `Rider.payoutProvider` is `mtn-momo` or `mpesa`; existing rows default to
  `mtn-momo`. MTN numbers normalize to Uganda `256...`, M-Pesa to Kenya `254...`.
- `POST /api/riders` validates the provider-specific phone. The signed-in
  `/api/platform/riders/me` endpoint lets riders update payout details; changes
  are held for `PAYOUT_PHONE_COOLDOWN_DAYS` (7 days by default).
- `payRiderForDeliveredJob()` sends earnings only once the paid delivery is
  marked delivered. MTN supports UGX; KES/M-Pesa payouts are queued for the
  manual payout ledger after the refund window and payout-detail cooldown.
  Provider/currency mismatches and invalid numbers require
  manual review. Per-delivery MTN transfers use `Disbursement.payoutKey` to
  prevent duplicate requests.

### Safaricom payout ledger (manual VCF mode)

- `Payout`/`PayoutOrder` remain separate from per-delivery `Disbursement` records.
- `GET /api/admin/payouts/run` is protected by `CRON_SECRET`; Vercel runs it
  daily. Riders batch daily, shops batch Mondays (UTC).
- Eligibility requires paid and delivered KES orders, a closed 48-hour refund
  window, no non-rejected refund request, and a recipient phone unchanged for
  the configured cooldown (conservatively measured using account `updatedAt`).
- Configure positive `PAYOUT_MAX_RECIPIENT_KES` and `PAYOUT_MAX_DAILY_KES`;
  both also respect the hard Safaricom caps. `PAYOUT_AUTO_APPROVAL_LIMIT_KES`
  defaults to zero; larger batches need approval by a different user in
  `PAYOUT_ADMIN_USER_IDS`.
- KES batches contain no more than five recipients per set. Each payout is
  capped at KES 250,000; all scheduled sets plus money already sent that Nairobi
  day must stay at or below KES 500,000. The planner reserves room for previously
  scheduled sets, and a recipient is capped at KES 500,000 per Nairobi day.
- An authorized admin uses `/safaricom-payouts` to download one VCF per set,
  after explicitly entering other money already sent that day (zero is valid).
  VCF contact names include batch, set, role, recipient, and amount. Verify
  imported names and amounts in Safaricom Send to Many on the approved business
  line before sending. A set can be exported only once.
- After sending, record the exact set total; a mismatch is rejected. Confirm
  only after checking Safaricom results/receipts. Each export, sent action, and
  confirmation records the admin and timestamp. A batch becomes `PAID` only
  when every set is confirmed. Delete the `ZP-<batch>` contacts from the phone
  after confirming. Retain the VCF, Safaricom receipts, and payout ledger
  reconciliation according to finance policy.
- More than 40 sets/sends in a Nairobi week triggers an operational warning.
  Ask Safaricom about the appropriate business-line process before volume grows.
- Only KES/M-Pesa payouts enter these batches; the MTN disbursement path remains
  UGX-only. Any matching existing M-Pesa `Disbursement` excludes that payout
  from the manual ledger. Never use Daraja B2C for delivery payouts.

### Delivery payment flow

```
referenceId prefix: DLV-{jobId}
  → MTN webhook → POST /api/webhook/momo
  → if DLV-: handleDukaboda() within Zuria's webhook route
  → legacy DLV- references are handled by the MTN webhook dispatcher
```

### Local webhook route (`app/api/webhook/momo/route.ts`)

Receives forwards from Platform Manager (api.maxnovate.com).
Routes internally by prefix:
- `ORD-` → handleZuria (order confirmation + payouts)
- `DLV-` → handleDukaboda (rider payout)

### Fee model (`lib/platform.ts` — single source of truth)

```typescript
calculateFees(subtotal, deliveryCost, approvalSource)
// approvalSource: "shop" | "platform"
// shop-linked riders: 0% delivery fee
// wildcard (platform-approved) riders: 10% delivery fee
```

Returns: `{ platformFee, deliveryFee, shopPayout, riderPayout, vendlyTotal }`

---

## Database — key models

- `Shop` — has momoPhone, currency, latitude, longitude
- `Order` — paymentRef (ORD- reference), isPaid, paymentStatus, shopPayout,
  shopPayoutStatus, riderPayoutStatus, deliveryCost (Decimal)
- `PaymentAttempt` — provider, amount/currency snapshot, providerRef, status,
  receipt, and needsRefund flag for duplicate successful collections
- `Disbursement` — per-payout record; `payoutKey` prevents duplicate rider
  transfers and provider-specific IDs match callbacks
- `Payout`, `PayoutOrder`, and `PayoutBatch` — KES M-Pesa payout ledger,
  order-share uniqueness, and CSV/manual reconciliation batches
- `DeliveryJob` — orderId @unique, shopId, riderId, vehicleType (VehicleType enum),
  riderNetPayout, riderPlatformFee, isShopLinked, status
- `Rider` — vehicleType (VehicleType enum @default(motorcycle)),
  payoutProvider (@default(mtn-momo)), approvedBy, isApproved, isActive, rating
- `Product` — price (Decimal), isArchived

### VehicleType enum

```prisma
enum VehicleType { bicycle  motorcycle  car }
```

Import from `@prisma/client`. Never redeclare locally.

---

## Delivery provider registry (`lib/delivery/`)

Providers: `custom` (Dukaboda), `safeboda`, `mock`

Vehicle pricing (from `lib/delivery/providers/custom.ts`):
- bicycle: UGX 2,000 base + 800/km, max 3 km
- motorcycle: UGX 3,000 base + 1,200/km, max 8 km
- car: UGX 5,000 base + 2,000/km, unlimited

Fee split computed at **payment confirmation time**, not quote time.
`DeliveryJob.riderNetPayout` and `riderPlatformFee` are set when the job is created.

---
### Sandbox → production checklist

- [ ] `X-Target-Environment` → `mtnuganda` in payment handlers
- [ ] `paymentStatus: "completed"` (not "paid") — schema enforced values
- [ ] Disbursement table exists (migration applied)
- [ ] shopPayoutStatus / riderPayoutStatus fields on Order exist

---

## Dukaboda integration

Dukaboda is powered inside Zuria:
- `ZURIA_API_URL` is used as `DUKABODA_URL` in Platform Manager handlers
- Dukaboda app uses Zuria's Clerk instance (unified auth)
- Rider registrations: `POST /api/riders` (x-api-key guarded)
- Rider status updates: `PATCH /api/riders/[riderId]/status`

---

## Do not

- Do not use `paymentStatus: "paid"` — valid values are `pending | completed | failed`
- Do not compute fees inline — always use `calculateFees()` from `lib/platform.ts`
- Do not call `disburse` before `Order.isPaid === true`
- Do not skip creating a `Disbursement` record before calling MoMo transfer —
  the webhook dispatcher has nothing to match against without it
- Do not run `prisma migrate reset`
- Do not commit `.env.local`
- Do not separate DLV- and ORD- into different webhook endpoints —
  both must land at `/api/webhook/momo` which Zuria routes internally