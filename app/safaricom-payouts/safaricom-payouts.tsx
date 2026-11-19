"use client";

import { useCallback, useEffect, useState } from "react";

type Recipient = {
  id: string;
  name: string;
  role: string;
  phone: string;
  amount: number;
};

type PayoutSet = {
  id: string;
  setNo: number;
  scheduledDate: string;
  status: "PENDING" | "SENT" | "CONFIRMED";
  totalAmount: number;
  exportedAt: string | null;
  exportedBy: string | null;
  otherMoneySentToday: number | null;
  sentAt: string | null;
  sentBy: string | null;
  sentAmount: number | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  recipients: Recipient[];
};

type Batch = {
  id: string;
  batchRef: string;
  status: string;
  totalAmount: number;
  payoutSets: PayoutSet[];
};

type ResponseData = {
  weeklySends: number;
  legacyBatchCount: number;
  batches: Batch[];
};

function kes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default function SafaricomPayouts() {
  const [data, setData] = useState<ResponseData>();
  const [error, setError] = useState("");
  const [otherMoney, setOtherMoney] = useState<Record<string, string>>({});
  const [sentAmounts, setSentAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/payouts/safaricom-sets", {
      cache: "no-store",
    });
    const result = (await response.json()) as
      | ResponseData
      | { error?: string };
    if (!response.ok || !("batches" in result)) {
      throw new Error(
        "error" in result ? result.error ?? "Could not load payout sets." : "Could not load payout sets.",
      );
    }
    setData(result);
  }, []);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load payout sets.");
    });
  }, [refresh]);

  async function act(batch: Batch, set: PayoutSet, action: "export" | "sent" | "confirm") {
    setBusy(set.id);
    setError("");
    try {
      const body =
        action === "export"
          ? { otherMoneySentToday: Number(otherMoney[set.id]) }
          : action === "sent"
            ? { sentAmount: Number(sentAmounts[set.id] ?? set.totalAmount) }
            : undefined;
      const response = await fetch(
        `/api/admin/payouts/batches/${batch.id}/sets/${set.id}/${action}`,
        {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? `Could not ${action} this set.`);
      }
      if (action === "export") {
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `zuria-${batch.batchRef}-set-${set.setNo}.vcf`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} this set.`);
    } finally {
      setBusy("");
    }
  }

  const sends = data?.weeklySends ?? 0;
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-semibold">Safaricom payouts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manual KES workflow. Import VCF contacts into the approved business-line phone
          and use Safaricom Send to Many; Zuria never submits B2C payments.
        </p>
      </header>

      <aside className="rounded border border-amber-400 bg-amber-50 p-4 text-sm">
        Each send contains up to five recipients. Keep today&apos;s scheduled sets plus
        all other money sent today within KES 500,000. After confirming, delete the
        ZP-&lt;batch&gt; contacts from the phone. Use the approved business line and
        retain receipts and payout records.
      </aside>

      <section className={`rounded border p-4 ${sends > 40 ? "border-red-500 bg-red-50" : ""}`}>
        <strong>{sends} sends needed this Nairobi week</strong>
        {sends > 40 && (
          <p className="mt-1 text-sm">
            Warning: more than 40 sends this week. Ask Safaricom about the approved
            business-line process before proceeding.
          </p>
        )}
      </section>

      {(data?.legacyBatchCount ?? 0) > 0 && (
        <p role="alert" className="rounded border border-amber-500 bg-amber-50 p-4 text-sm">
          {data?.legacyBatchCount} batch(es) were already marked as sending before
          the VCF workflow. They were not converted or made exportable; manually
          reconcile those batches before further payment.
        </p>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!data && <p>Loading payout sets…</p>}
      {data?.batches.length === 0 && <p>No approved payout batches.</p>}

      {data?.batches.map((batch) => (
        <section key={batch.id} className="space-y-3">
          <h2 className="text-xl font-semibold">
            Batch {batch.batchRef} · {kes(batch.totalAmount)} · {batch.status}
          </h2>
          {batch.payoutSets.map((set) => (
            <article key={set.id} className="space-y-3 rounded border p-4">
              <header className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  Set {set.setNo} · {set.scheduledDate} · {kes(set.totalAmount)}
                </h3>
                <span>{set.status}</span>
              </header>
              <ul className="divide-y rounded border">
                {set.recipients.map((recipient) => (
                  <li key={recipient.id} className="flex justify-between gap-2 p-2 text-sm">
                    <span>{recipient.role} · {recipient.name} · {recipient.phone}</span>
                    <span>{kes(recipient.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {set.exportedAt &&
                  `Exported by ${set.exportedBy ?? "unknown"} at ${new Date(set.exportedAt).toLocaleString()} · other money sent: ${kes(set.otherMoneySentToday ?? 0)}`}
                {set.sentAt &&
                  ` · Marked sent by ${set.sentBy ?? "unknown"} at ${new Date(set.sentAt).toLocaleString()} (${kes(set.sentAmount ?? 0)})`}
                {set.confirmedAt &&
                  ` · Confirmed by ${set.confirmedBy ?? "unknown"} at ${new Date(set.confirmedAt).toLocaleString()}`}
              </p>

              {set.status === "PENDING" && !set.exportedAt && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm">
                    Other money already sent today (KES; enter 0 if none)
                    <input
                      type="number"
                      min="0"
                      max="500000"
                      step="1"
                      value={otherMoney[set.id] ?? ""}
                      onChange={(event) =>
                        setOtherMoney((current) => ({ ...current, [set.id]: event.target.value }))
                      }
                      className="h-10 rounded border px-3"
                    />
                  </label>
                  <button
                    disabled={busy === set.id || otherMoney[set.id] === undefined || otherMoney[set.id] === ""}
                    onClick={() => act(batch, set, "export")}
                    className="h-10 rounded bg-slate-900 px-4 text-white disabled:opacity-50"
                  >
                    Download VCF
                  </button>
                </div>
              )}
              {set.status === "PENDING" && set.exportedAt && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm">
                    Exact total sent (KES)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={sentAmounts[set.id] ?? String(set.totalAmount)}
                      onChange={(event) =>
                        setSentAmounts((current) => ({ ...current, [set.id]: event.target.value }))
                      }
                      className="h-10 rounded border px-3"
                    />
                  </label>
                  <button
                    disabled={busy === set.id}
                    onClick={() => act(batch, set, "sent")}
                    className="h-10 rounded bg-slate-900 px-4 text-white disabled:opacity-50"
                  >
                    Mark set sent
                  </button>
                </div>
              )}
              {set.status === "SENT" && (
                <button
                  disabled={busy === set.id}
                  onClick={() => act(batch, set, "confirm")}
                  className="h-10 rounded bg-emerald-700 px-4 text-white disabled:opacity-50"
                >
                  Confirm set paid
                </button>
              )}
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
