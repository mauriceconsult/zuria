# Manual Safaricom KES payouts

Zuria does not submit Safaricom B2C payouts. Approved KES payout batches are
planned into sets of up to five recipients, and an administrator exports one
VCF contact file per set from `/safaricom-payouts`. The administrator imports
the contacts into the organization's Safaricom business-line phone and sends
them through the Safaricom app's **Send to Many** flow.

## Limits and planning

- Each recipient payment must be at most KES 250,000.
- All Zuria sets scheduled for one Nairobi calendar day, plus other money
  already sent that day, must total no more than KES 500,000.
- The planner reserves room for previously scheduled sets and limits a
  recipient's scheduled in-app payments to KES 500,000 per Nairobi day.
- Each Send to Many action contains at most five contacts. The app shows the
  number of sets/sends needed for the Nairobi week and warns above 40.
- Riders are batched daily; shops are batched weekly on Monday (UTC), subject to
  the paid-delivery refund window, recipient-detail cooldown, and other ledger
  eligibility checks.

At VCF export, enter the whole-KES amount of other money already sent on the
set's scheduled Nairobi date. Enter `0` when none has been sent. Zuria refuses
export if this amount plus all scheduled Zuria sets for that date exceeds the
daily cap. A set is exportable only on its scheduled Nairobi date, and only
once; an exported but unfinished set remains visible and cannot be re-exported.

## Operating procedure

1. Review and approve the payout batch using a different allow-listed
   administrator when the configured approval threshold requires it.
2. Open `/safaricom-payouts`. Check the batch, scheduled date, set number,
   recipient name, phone, and amount before downloading the VCF.
3. Enter other money sent that Nairobi day, including payments outside Zuria.
   The export action requires an explicit value; zero is valid.
4. Import that set's VCF into the organization's approved Safaricom business
   line. Verify the imported contact names and amounts in Safaricom **Send to
   Many** before authorizing payment. Names follow
   `ZP-<batchRef>-S<setNo> <Role> <Name> <amount> KES`.
5. Send the set and record the exact total sent. Zuria rejects a reported total
   that differs from the planned set total.
6. Reconcile the Safaricom result and receipts, then confirm the set in Zuria.
   Only when every set is confirmed does the batch become `PAID`.
7. Delete that batch's `ZP-<batchRef>` contacts from the phone after
   confirmation. Retain the batch, send date, recipient/amount list, Safaricom
   receipts, and administrator confirmation according to finance policy.

Use the approved business line, not a personal line. Follow Safaricom's
business terms and internal approval/recordkeeping controls. The app records
the administrator and timestamp for each set export, sent action, and
confirmation; never mark a set sent or confirmed based only on an unverified
screen or contact import.

## Required pre-production import dry run

Before any production payout batch, an authorized finance administrator must
run a small real Safaricom test with two approved test recipients at KES 10
each. Confirm that the contacts import with the expected names and amounts,
then verify the Safaricom result and receipts against the Zuria set. Use a
properly approved business-line/test setup and record the result. Do not mark
the set sent or confirmed until Safaricom confirms the transfer. Remove the
test contacts afterward.

This dry run requires an authorized admin, a Safaricom-enabled business line,
and two approved recipient numbers. It cannot be completed by local code
validation alone.

## Manual route verification (isolated test data only)

Use an isolated non-production database, `PAYOUTS_ENABLED=true`, an approved
test batch, and two allow-listed administrator sessions. Do not use a live
production payout batch to test failure cases.

1. **Confirmation mismatch:** export a pending set, then POST to
   `/api/admin/payouts/batches/<batchId>/sets/<setId>/sent` with
   `{"sentAmount": <setTotal + 1>}`. Expect HTTP 409 and the set to remain
   `PENDING`.
2. **Re-export refusal:** POST again to
   `/api/admin/payouts/batches/<batchId>/sets/<setId>/export` with
   `{"otherMoneySentToday": 0}`. Expect HTTP 409 and no second VCF.
3. **Concurrent confirm:** mark the exported set `SENT` using its exact total,
   then send two simultaneous POST requests to
   `/api/admin/payouts/batches/<batchId>/sets/<setId>/confirm` from separate
   admin sessions. Expect one HTTP 200 and one HTTP 409; the set must have one
   confirmation actor/timestamp and must not be paid twice.
4. **Cross-currency/provider rejection:** in the isolated database, attach a
   `UGX` or non-`mpesa` payout to a pending set and POST its export request.
   Expect HTTP 409 and no export audit timestamp.

Restore the test fixture after each case. Do not manually alter a production
ledger row to exercise these checks.
