const DEFAULT_COLUMNS = [
  "Phone:phone",
  "Amount:amount",
  "Reference:payoutId",
  "Remarks:recipientType",
] as const;

const FIELD_VALUES: Record<string, (payout: {
  id: string;
  recipientType: string;
  phone: string;
  amount: { toString(): string };
  currency: string;
  recipientId: string;
}) => string> = {
  payoutId: (payout) => payout.id,
  recipientType: (payout) => payout.recipientType,
  recipientId: (payout) => payout.recipientId,
  phone: (payout) => payout.phone,
  amount: (payout) => payout.amount.toString(),
  currency: (payout) => payout.currency,
};

function quoteCsv(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildPayoutCsv(
  payouts: Array<{
    id: string;
    recipientType: string;
    recipientId: string;
    phone: string;
    amount: { toString(): string };
    currency: string;
  }>,
) {
  const configured = process.env.MPESA_BULK_CSV_COLUMNS;
  const columns = configured
    ? configured.split(",").map((column) => {
        const [header, field] = column.trim().split(":");
        if (!header || !field || !FIELD_VALUES[field]) {
          throw new Error(
            "MPESA_BULK_CSV_COLUMNS entries must be Header:field using payoutId, recipientType, recipientId, phone, amount, or currency",
          );
        }
        return { header, field };
      })
    : DEFAULT_COLUMNS.map((column) => {
        const [header, field] = column.split(":");
        return { header, field };
      });

  const header = columns.map((column) => quoteCsv(column.header)).join(",");
  const rows = payouts.map((payout) =>
    columns
      .map((column) => quoteCsv(FIELD_VALUES[column.field](payout)))
      .join(","),
  );
  return `${header}\r\n${rows.join("\r\n")}\r\n`;
}
