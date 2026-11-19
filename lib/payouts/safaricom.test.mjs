import { expect, test } from "bun:test";
import {
  buildSafaricomVcf,
  getNairobiDateKey,
  planSafaricomSets,
} from "./safaricom.ts";

test("planner chunks at five and numbers sets", () => {
  const payouts = Array.from({ length: 11 }, (_, i) => ({
    id: `${i}`,
    recipientId: `${i}`,
    recipientType: "rider",
    amount: 10,
  }));
  const sets = planSafaricomSets(payouts, [], new Date("2026-11-19T10:00:00Z"));
  expect(sets.map((set) => set.payoutIds.length)).toEqual([5, 5, 1]);
  expect(sets.map((set) => set.setNo)).toEqual([1, 2, 3]);
});

test("planner reserves day capacity and recipient wallet capacity", () => {
  const sets = planSafaricomSets(
    [{ id: "p", recipientId: "r", recipientType: "shop", amount: 100_000 }],
    [{ scheduledDate: "2026-11-19", recipients: [{ recipientId: "other", amount: 450_000 }] }],
    new Date("2026-11-19T10:00:00Z"),
  );
  expect(sets[0].scheduledDate).toBe("2026-11-20");
});

test("planner rejects a payout above KES 250,000", () => {
  expect(() =>
    planSafaricomSets(
      [{ id: "p", recipientId: "r", recipientType: "rider", amount: 250_001 }],
      [],
    ),
  ).toThrow(/transaction cap/);
});

test("VCF escapes names and normalizes Kenyan phones", () => {
  const vcf = buildSafaricomVcf({
    batchRef: "ABC123",
    setNo: 2,
    recipients: [{
      recipientType: "shop",
      recipientName: "Jane, Smith; Retail\nLtd",
      phone: "0712 345 678",
      amount: 10,
    }],
  });
  expect(vcf).toContain("FN:ZP-ABC123-S2 Shop Jane\\, Smith\\; Retail\\nLtd 10 KES");
  expect(vcf).toContain("TEL;TYPE=CELL:+254712345678");
});

test("VCF rejects invalid phones and Nairobi dates follow local time", () => {
  expect(() => buildSafaricomVcf({
    batchRef: "X",
    setNo: 1,
    recipients: [{ recipientType: "rider", recipientName: "X", phone: "0700", amount: 10 }],
  })).toThrow(/Invalid Kenyan M-Pesa phone/);
  expect(getNairobiDateKey(new Date("2026-11-18T22:30:00Z"))).toBe("2026-11-19");
});
