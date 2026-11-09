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
- Payments: MTN MoMo (Collections + Disbursements)
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
  → UGX MTN MoMo shop/rider disbursements continue through Disbursement records
```

Daraja callbacks are received at `POST /api/webhook/daraja`; MTN callbacks continue
at `POST /api/webhook/momo` (which also routes legacy `ORD-` and `DLV-` references).
Payment collection supports UGX/MTN MoMo and KES/Safaricom M-Pesa. Automated
disbursements remain MTN MoMo only.
Delivery quote signing requires `DELIVERY_QUOTE_SECRET` (at least 32 characters).

### M-Pesa payout ledger (manual CSV mode)

- `Payout`/`PayoutOrder` are separate from live MTN `Disbursement` records.
- `GET /api/admin/payouts/run` is protected by `CRON_SECRET`; Vercel runs it
  daily. Riders batch daily, shops batch Mondays (UTC).
- Eligibility requires paid and delivered KES orders, a closed 48-hour refund
  window, no non-rejected refund request, and a recipient phone unchanged for
  the configured cooldown (conservatively measured using account `updatedAt`).
- Configure positive `PAYOUT_MAX_RECIPIENT_KES` and `PAYOUT_MAX_DAILY_KES`;
  missing caps stop batch creation. `PAYOUT_AUTO_APPROVAL_LIMIT_KES` defaults
  to zero; larger batches need a different user in `PAYOUT_ADMIN_USER_IDS`.
- CSV export is guarded by `PAYOUTS_ENABLED=true`. Its default column mapping is
  explicitly a draft and must be replaced with Safaricom's confirmed upload
  template. Amounts are rounded to whole KES. Recipient phone and cooldown are
  checked again before batching and export; changed details require manual review.
  Export marks a batch `SENDING`; an authorized admin reconciles each result with
  the exact phone, amount, receipt, and optional registered recipient name.
  Uncertain results are not retried, and the same CSV batch must never be uploaded
  more than once.
- The mock Mode B sender is available only outside production when both
  `PAYOUTS_ENABLED=true` and `PAYOUTS_MOCK_SENDER_ENABLED=true`; it never sends
  money. No live Daraja B2C sender is implemented.

### Delivery payment flow

```
referenceId prefix: DLV-{jobId}
  → MTN webhook → POST /api/webhook/momo
  → if DLV-: handleDukaboda() within Zuria's webhook route
  → reads riderNetPayout from DeliveryJob (set at quote time)
  → disburses to rider's MTN MoMo number
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
- `Disbursement` — per-payout record (shop or rider), momoReferenceId @unique,
  momoStatus; this is what webhook handler matches against
- `Payout`, `PayoutOrder`, and `PayoutBatch` — KES M-Pesa payout ledger,
  order-share uniqueness, and CSV/manual reconciliation batches
- `DeliveryJob` — orderId @unique, shopId, riderId, vehicleType (VehicleType enum),
  riderNetPayout, riderPlatformFee, isShopLinked, status
- `Rider` — vehicleType (VehicleType enum @default(motorcycle)), approvedBy,
  isApproved, isActive, rating
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