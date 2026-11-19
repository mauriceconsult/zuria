export const SAFARICOM_MAX_RECIPIENTS_PER_SEND = 5;
export const SAFARICOM_MAX_TRANSACTION_KES = 250_000;
export const SAFARICOM_MAX_DAILY_KES = 500_000;
export const SAFARICOM_MAX_RECIPIENT_DAILY_KES = 500_000;

export type SafaricomPayout = {
  id: string;
  recipientId: string;
  recipientType: "shop" | "rider";
  amount: number;
};

export type ReservedSafaricomSet = {
  scheduledDate: string;
  recipients: Array<Pick<SafaricomPayout, "recipientId" | "amount">>;
};

export type PlannedSafaricomSet = {
  setNo: number;
  scheduledDate: string;
  payoutIds: string[];
  totalAmount: number;
  recipients: Array<Pick<SafaricomPayout, "recipientId" | "amount">>;
};

function assertPayout(payout: SafaricomPayout) {
  if (!Number.isSafeInteger(payout.amount) || payout.amount <= 0) {
    throw new Error(`Payout ${payout.id} must be a positive whole KES amount`);
  }
  if (payout.amount > SAFARICOM_MAX_TRANSACTION_KES) {
    throw new Error(
      `Payout ${payout.id} exceeds the KES ${SAFARICOM_MAX_TRANSACTION_KES} transaction cap`,
    );
  }
}

function nairobiDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function addRecipientAmounts(
  totals: Map<string, number>,
  recipients: Array<Pick<SafaricomPayout, "recipientId" | "amount">>,
) {
  for (const recipient of recipients) {
    totals.set(
      recipient.recipientId,
      (totals.get(recipient.recipientId) ?? 0) + recipient.amount,
    );
  }
}

export function planSafaricomSets(
  payouts: SafaricomPayout[],
  reservedSets: ReservedSafaricomSet[],
  now = new Date(),
): PlannedSafaricomSet[] {
  for (const payout of payouts) assertPayout(payout);

  const days = new Map<
    string,
    { total: number; recipients: Map<string, number> }
  >();
  for (const reserved of reservedSets) {
    const day = days.get(reserved.scheduledDate) ?? {
      total: 0,
      recipients: new Map<string, number>(),
    };
    for (const recipient of reserved.recipients) {
      day.total += recipient.amount;
    }
    addRecipientAmounts(day.recipients, reserved.recipients);
    days.set(reserved.scheduledDate, day);
  }

  const groups: Array<{
    payoutIds: string[];
    recipients: Array<Pick<SafaricomPayout, "recipientId" | "amount">>;
    totalAmount: number;
  }> = [];
  let group = {
    payoutIds: [] as string[],
    recipients: [] as Array<Pick<SafaricomPayout, "recipientId" | "amount">>,
    totalAmount: 0,
  };
  for (const payout of payouts) {
    if (
      group.payoutIds.length === SAFARICOM_MAX_RECIPIENTS_PER_SEND ||
      group.totalAmount + payout.amount > SAFARICOM_MAX_DAILY_KES
    ) {
      groups.push(group);
      group = { payoutIds: [], recipients: [], totalAmount: 0 };
    }
    group.payoutIds.push(payout.id);
    group.recipients.push({
      recipientId: payout.recipientId,
      amount: payout.amount,
    });
    group.totalAmount += payout.amount;
  }
  if (group.payoutIds.length) groups.push(group);

  const firstDate = nairobiDateKey(now);
  return groups.map((pending, index) => {
    let scheduledDate = firstDate;
    let attempts = 0;
    while (attempts < 3660) {
      const day = days.get(scheduledDate) ?? {
        total: 0,
        recipients: new Map<string, number>(),
      };
      const nextRecipientTotals = new Map(day.recipients);
      addRecipientAmounts(nextRecipientTotals, pending.recipients);
      const recipientCapacityAvailable = [...nextRecipientTotals.values()].every(
        (total) => total <= SAFARICOM_MAX_RECIPIENT_DAILY_KES,
      );
      if (
        day.total + pending.totalAmount <= SAFARICOM_MAX_DAILY_KES &&
        recipientCapacityAvailable
      ) {
        day.total += pending.totalAmount;
        day.recipients = nextRecipientTotals;
        days.set(scheduledDate, day);
        return {
          setNo: index + 1,
          scheduledDate,
          payoutIds: pending.payoutIds,
          totalAmount: pending.totalAmount,
          recipients: pending.recipients,
        };
      }
      scheduledDate = nextDateKey(scheduledDate);
      attempts++;
    }
    throw new Error("Unable to schedule payout sets within the ten-year planning window");
  });
}

export function normalizeSafaricomPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("254")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^[17]\d{8}$/.test(national)) {
    throw new Error(`Invalid Kenyan M-Pesa phone number: ${phone}`);
  }
  return `+254${national}`;
}

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildSafaricomVcf(input: {
  batchRef: string;
  setNo: number;
  recipients: Array<{
    recipientType: "shop" | "rider";
    recipientName: string;
    phone: string;
    amount: number;
  }>;
}): string {
  if (!input.batchRef.trim() || !Number.isSafeInteger(input.setNo) || input.setNo < 1) {
    throw new Error("A batch reference and positive set number are required");
  }
  if (
    input.recipients.length < 1 ||
    input.recipients.length > SAFARICOM_MAX_RECIPIENTS_PER_SEND
  ) {
    throw new Error("A Safaricom send must contain between one and five recipients");
  }
  return (
    input.recipients
      .map((recipient) => {
        if (
          !Number.isSafeInteger(recipient.amount) ||
          recipient.amount <= 0 ||
          recipient.amount > SAFARICOM_MAX_TRANSACTION_KES
        ) {
          throw new Error("Each VCF recipient amount must be between KES 1 and 250,000");
        }
        const role = recipient.recipientType === "shop" ? "Shop" : "Rider";
        const displayName = escapeVCardText(
          `ZP-${input.batchRef}-S${input.setNo} ${role} ${recipient.recipientName} ${recipient.amount} KES`,
        );
        const phone = normalizeSafaricomPhone(recipient.phone);
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${displayName}`,
          `N:${displayName};;;;`,
          `TEL;TYPE=CELL:${phone}`,
          "END:VCARD",
        ].join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}

export function nairobiDateStart(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid Nairobi schedule date");
  }
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function getNairobiDateKey(date = new Date()): string {
  return nairobiDateKey(date);
}
