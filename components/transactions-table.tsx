"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react";
import { formatDateTime, formatMinor } from "@/lib/format";
import type { AdminTransaction } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type SortKey = "org" | "type" | "status" | "amount" | "created";
type SortDir = "asc" | "desc";

const COLUMNS: { label: string; key?: SortKey }[] = [
  { label: "Empresa", key: "org" },
  { label: "Tipo", key: "type" },
  { label: "Status do ticket", key: "status" },
  { label: "Estado interno" },
  { label: "Valor", key: "amount" },
  { label: "Taxas" },
  { label: "Criado em", key: "created" },
];

const TYPE_LABEL: Record<AdminTransaction["type"], string> = {
  deposit: "Depósito",
  convert_and_send: "Conversão",
  payout: "Pagamento",
};

// Ticket-status → filter group. FAILED and any PARTIAL* land under "Falhas". Unknown codes
// stay visible only under "Todos" (group null) and render as a neutral chip.
type TicketGroup = "paid" | "processing" | "unpaid" | "failed";

function ticketGroup(status: string): TicketGroup | null {
  if (status === "PAID") return "paid";
  if (status === "PROCESSING") return "processing";
  if (status === "UNPAID") return "unpaid";
  if (status === "FAILED" || status.startsWith("PARTIAL")) return "failed";
  return null;
}

// Chips reuse the theme's semantic palette (no amber/rose tokens exist here): gold = pending,
// emerald = settled, clay = failure, warm = neutral. Matches CASE_STATUS_BADGE idioms.
const TICKET_BADGE: Record<TicketGroup, string> = {
  unpaid: "border-warm-600/30 bg-warm-600/10 text-warm-400",
  processing: "border-gold-500/30 bg-gold-500/10 text-gold-500",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  failed: "border-clay-500/30 bg-clay-500/10 text-clay-500",
};
const NEUTRAL_BADGE = "border-warm-600/30 bg-warm-600/10 text-warm-400";

function ticketLabel(status: string): string {
  switch (ticketGroup(status)) {
    case "paid":
      return "Pago";
    case "processing":
      return "Processando";
    case "unpaid":
      return "Não pago";
    case "failed":
      return status.startsWith("PARTIAL") ? "Parcial" : "Falha";
    default:
      return status;
  }
}

function typeLabel(t: AdminTransaction["type"]): string {
  return TYPE_LABEL[t] ?? t;
}

function txAmount(t: AdminTransaction): number | null {
  return t.destAmount ?? t.sourceAmount;
}

function txValue(t: AdminTransaction): string {
  return formatMinor(t.destAmount ?? t.sourceAmount, t.destCurrency ?? t.sourceCurrency);
}

// Avenia itemizes fees per currency (multi-currency appliedFees) and the minor-unit scales
// differ (BRL 2dp vs USDC/USDT 6dp), so amounts must NEVER be summed across currencies —
// group per currency and join the totals. Per-fee breakdown lives in the title.
function feesTotal(t: AdminTransaction): { label: string; title?: string } {
  if (t.fees.length === 0) return { label: "—" };
  const byCurrency = new Map<string, number>();
  for (const f of t.fees) byCurrency.set(f.currency, (byCurrency.get(f.currency) ?? 0) + f.amount);
  return {
    label: [...byCurrency].map(([currency, total]) => formatMinor(total, currency)).join(" + "),
    title: t.fees.map((f) => `${f.label}: ${formatMinor(f.amount, f.currency)}`).join("\n"),
  };
}

export function TransactionsTable({ transactions }: { transactions: AdminTransaction[] }) {
  const [group, setGroup] = useState<"all" | TicketGroup>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const groupCounts = useMemo(
    () =>
      transactions.reduce<Record<string, number>>((acc, t) => {
        const g = ticketGroup(t.ticketStatus);
        if (g) acc[g] = (acc[g] ?? 0) + 1;
        return acc;
      }, {}),
    [transactions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = transactions;
    if (group !== "all") rows = rows.filter((t) => ticketGroup(t.ticketStatus) === group);
    if (q) {
      rows = rows.filter(
        (t) =>
          t.razaoSocial.toLowerCase().includes(q) ||
          (t.vendorRef ?? "").toLowerCase().includes(q),
      );
    }
    if (from) rows = rows.filter((t) => t.createdAt.slice(0, 10) >= from);
    if (to) rows = rows.filter((t) => t.createdAt.slice(0, 10) <= to);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "org":
          cmp = a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR");
          break;
        case "type":
          cmp = typeLabel(a.type).localeCompare(typeLabel(b.type), "pt-BR");
          break;
        case "status":
          cmp = ticketLabel(a.ticketStatus).localeCompare(ticketLabel(b.ticketStatus), "pt-BR");
          break;
        case "amount":
          cmp = (txAmount(a) ?? -Infinity) - (txAmount(b) ?? -Infinity);
          break;
        case "created":
          cmp = Date.parse(a.createdAt) - Date.parse(b.createdAt);
          break;
      }
      return cmp * dir;
    });
  }, [transactions, group, search, from, to, sortKey, sortDir]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setPage(0);
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created" || key === "amount" ? "desc" : "asc");
    }
  }

  const groupFilters: { key: "all" | TicketGroup; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "paid", label: "Pagos" },
    { key: "processing", label: "Processando" },
    { key: "unpaid", label: "Não pagos" },
    { key: "failed", label: "Falhas" },
  ];

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-input/30 pl-9 pr-2.5 text-sm text-warm-100 outline-none transition-colors placeholder:text-warm-500 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const controlClass =
    "h-9 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groupFilters.map((f) => {
          const count = f.key === "all" ? transactions.length : groupCounts[f.key] ?? 0;
          const active = group === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setGroup(f.key);
                setPage(0);
              }}
              aria-pressed={active}
              className={cn(
                "min-h-11 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-gold-500/40 bg-gold-500/10 text-gold-500"
                  : "border-ink-500 text-warm-300 hover:bg-ink-700 hover:text-warm-100",
              )}
            >
              {f.label} <span className="text-warm-500">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="tx-search" className="mb-1 block text-xs text-warm-400">
            Buscar por empresa ou referência
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-warm-500"
              aria-hidden
            />
            <input
              id="tx-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Ex.: Empresa LTDA ou tkt_abc123"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="tx-from" className="mb-1 block text-xs text-warm-400">
            Criado de
          </label>
          <input
            id="tx-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="tx-to" className="mb-1 block text-xs text-warm-400">
            até
          </label>
          <input
            id="tx-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
            className={controlClass}
          />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-warm-500">
          {transactions.length === 0 ? "Nenhuma transação ainda." : "Nenhuma transação neste filtro."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-ink-500">
            <table className="w-full text-sm">
              <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  {COLUMNS.map((c) => {
                    if (!c.key) {
                      return (
                        <th key={c.label} className="px-4 py-3 font-medium">
                          {c.label}
                        </th>
                      );
                    }
                    const isSorted = sortKey === c.key;
                    const Icon = !isSorted ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
                    return (
                      <th
                        key={c.key}
                        aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                        className="px-4 py-3 font-medium"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key!)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase tracking-wide outline-none transition-colors hover:text-warm-200 focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {c.label}
                          <Icon className={cn("size-3.5", isSorted ? "text-gold-500" : "text-warm-600")} aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500">
                {pageRows.map((t) => {
                  const g = ticketGroup(t.ticketStatus);
                  const fees = feesTotal(t);
                  return (
                    <tr key={t.id} className="text-warm-200">
                      <td className="px-4 py-3">
                        <span className="block font-medium text-warm-100">{t.razaoSocial}</span>
                        {t.vendorRef && (
                          <span
                            title={t.vendorRef}
                            className="mt-0.5 block max-w-[14rem] truncate font-mono text-xs text-warm-500"
                          >
                            {t.vendorRef}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-300">{typeLabel(t.type)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            g ? TICKET_BADGE[g] : NEUTRAL_BADGE,
                          )}
                        >
                          {ticketLabel(t.ticketStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-warm-500">{t.state}</td>
                      <td className="px-4 py-3 tabular-nums text-warm-200">{txValue(t)}</td>
                      <td className="px-4 py-3 tabular-nums text-warm-400" title={fees.title}>
                        {fees.label}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-warm-400">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-warm-400">
            <span>
              {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ink-500 px-3 outline-none transition-colors hover:bg-ink-700 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="tabular-nums text-warm-500">
                {clampedPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPage >= pageCount - 1}
                className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ink-500 px-3 outline-none transition-colors hover:bg-ink-700 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
