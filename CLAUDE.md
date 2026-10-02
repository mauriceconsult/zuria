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
  → POST /api/[shopId]/checkout/momo   (creates Order, calls RequestToPay)
  → referenceId prefix: ORD-{orderId}
  → MTN webhook → POST /api/webhook/momo
  → if ORD-: handleZuria() → onPaymentConfirmed()
  → Order.isPaid = true, products archived
  → Promise.allSettled([shopDisburse, riderDisburse])
  → Disbursement records created for each payout
```

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
- `Disbursement` — per-payout record (shop or rider), momoReferenceId @unique,
  momoStatus; this is what webhook handler matches against
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