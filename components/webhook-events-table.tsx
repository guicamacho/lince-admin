"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/metric-tile";
import { replayWebhookAction } from "@/lib/admin-actions";
import { formatDateTime } from "@/lib/format";
import type { WebhookEventRow } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type WebhookStatus = WebhookEventRow["status"];
type TabKey = "all" | "failed" | "processed" | "received";
type SortKey = "provider" | "status" | "attempts" | "received";
type SortDir = "asc" | "desc";

const NEUTRAL_BADGE = "border-warm-600/30 bg-warm-600/10 text-warm-400";

// avenia gold, clerk sky; resend/didit and anything else fall through to neutral.
const PROVIDER_BADGE: Record<string, string> = {
  avenia: "border-gold-500/30 bg-gold-500/10 text-gold-500",
  clerk: "border-sky-500/30 bg-sky-500/10 text-sky-500",
};

// clay is the theme's negative red; dead gets the heavier fill to read as terminal.
const STATUS_META: Record<WebhookStatus, { label: string; badge: string; order: number }> = {
  received: { label: "Recebido", badge: NEUTRAL_BADGE, order: 2 },
  processed: { label: "Processado", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", order: 0 },
  failed: { label: "Falhou", badge: "border-clay-500/30 bg-clay-500/10 text-clay-500", order: 3 },
  dead: { label: "Descartado", badge: "border-clay-500/50 bg-clay-500/20 font-semibold text-clay-500", order: 4 },
  ignored: { label: "Ignorado", badge: NEUTRAL_BADGE, order: 1 },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "failed", label: "Falhas" },
  { key: "processed", label: "Processados" },
  { key: "received", label: "Recebidos" },
];

const isFailed = (s: WebhookStatus) => s === "failed" || s === "dead";

function inTab(e: WebhookEventRow, tab: TabKey): boolean {
  switch (tab) {
    case "all":
      return true;
    case "failed":
      return isFailed(e.status);
    case "processed":
      return e.status === "processed";
    case "received":
      return e.status === "received";
  }
}

function ts(s: string | null): number {
  return s ? Date.parse(s) : -Infinity;
}

export function WebhookEventsTable({ events }: { events: WebhookEventRow[] }) {
  const failedCount = useMemo(() => events.filter((e) => isFailed(e.status)).length, [events]);
  const [tab, setTab] = useState<TabKey>(() => (failedCount > 0 ? "failed" : "all"));
  const [provider, setProvider] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("received");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const tabCounts = useMemo(
    () => ({
      all: events.length,
      failed: failedCount,
      processed: events.filter((e) => e.status === "processed").length,
      received: events.filter((e) => e.status === "received").length,
    }),
    [events, failedCount],
  );

  const providers = useMemo(
    () => Array.from(new Set(events.map((e) => e.provider_code))).sort((a, b) => a.localeCompare(b)),
    [events],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = events.filter((e) => inTab(e, tab));
    if (provider !== "all") rows = rows.filter((e) => e.provider_code === provider);
    if (q) {
      rows = rows.filter(
        (e) =>
          e.event_type.toLowerCase().includes(q) || e.external_event_id.toLowerCase().includes(q),
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "provider":
          cmp = a.provider_code.localeCompare(b.provider_code, "pt-BR");
          break;
        case "status":
          cmp = STATUS_META[a.status].order - STATUS_META[b.status].order;
          break;
        case "attempts":
          cmp = a.attempts - b.attempts;
          break;
        case "received":
          cmp = ts(a.received_at) - ts(b.received_at);
          break;
      }
      return cmp * dir;
    });
  }, [events, tab, provider, search, sortKey, sortDir]);

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
      setSortDir(key === "received" || key === "attempts" ? "desc" : "asc");
    }
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-input/30 pl-9 pr-2.5 text-sm text-warm-100 outline-none transition-colors placeholder:text-warm-500 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const controlClass =
    "h-9 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  const sortableTh = (key: SortKey, label: string) => {
    const isSorted = sortKey === key;
    const Icon = !isSorted ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <th
        key={key}
        aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className="px-4 py-3 font-medium"
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase tracking-wide outline-none transition-colors hover:text-warm-200 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {label}
          <Icon className={cn("size-3.5", isSorted ? "text-gold-500" : "text-warm-600")} aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Falhas"
          value={tabCounts.failed}
          tone={tabCounts.failed > 0 ? "bad" : "ok"}
          hint="Em falha ou descartados"
          icon={AlertTriangle}
        />
        <MetricTile label="Processados" value={tabCounts.processed} tone="ok" hint="Concluídos" icon={CheckCircle2} />
        <MetricTile label="Recebidos" value={tabCounts.received} hint="Aguardando processamento" icon={Inbox} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
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
              {t.label} <span className="text-warm-500">({tabCounts[t.key]})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="events-search" className="mb-1 block text-xs text-warm-400">
            Buscar por tipo ou ID do evento
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-warm-500"
              aria-hidden
            />
            <input
              id="events-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Ex.: payment.succeeded ou evt_123"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="events-provider" className="mb-1 block text-xs text-warm-400">
            Provedor
          </label>
          <select
            id="events-provider"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setPage(0);
            }}
            className={controlClass}
          >
            <option value="all">Todos os provedores</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-warm-500">
          {events.length === 0 ? "Nenhum evento registrado." : "Nenhum evento neste filtro."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-ink-500">
            <table className="w-full text-sm">
              <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  {sortableTh("provider", "Provedor")}
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  {sortableTh("status", "Status")}
                  {sortableTh("attempts", "Tentativas")}
                  <th className="px-4 py-3 font-medium">Último erro</th>
                  {sortableTh("received", "Recebido em")}
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500">
                {pageRows.map((e) => {
                  const meta = STATUS_META[e.status];
                  return (
                    <tr key={e.id} className="text-warm-200">
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            PROVIDER_BADGE[e.provider_code] ?? NEUTRAL_BADGE,
                          )}
                        >
                          {e.provider_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[18rem] truncate font-mono text-xs text-warm-100" title={e.event_type}>
                          {e.event_type}
                        </span>
                        <span
                          className="mt-0.5 block max-w-[18rem] truncate font-mono text-xs text-warm-500"
                          title={e.external_event_id}
                        >
                          {e.external_event_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-warm-300">{e.attempts}</td>
                      <td className="px-4 py-3 text-warm-400">
                        {e.last_error ? (
                          <span className="block max-w-[22rem] truncate" title={e.last_error}>
                            {e.last_error}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-warm-400">{formatDateTime(e.received_at)}</td>
                      <td className="px-4 py-3">{isFailed(e.status) ? <ReplayCell id={e.id} /> : null}</td>
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

// Inline confirm (Reprocessar → Confirmar/Cancelar). Per-row state, so it lives as its own
// component rather than a confirming-id map in the parent.
function ReplayCell({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function replay() {
    setError(null);
    start(async () => {
      const res = await replayWebhookAction(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      {confirming ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="destructive" className="cursor-pointer" onClick={replay} disabled={pending}>
            {pending ? "…" : "Confirmar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setConfirming(true)}>
          Reprocessar
        </Button>
      )}
      {error && (
        <p role="alert" className="max-w-[16rem] text-xs text-clay-500">
          {error}
        </p>
      )}
    </div>
  );
}
