"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Search } from "lucide-react";
import { AccessDialog } from "@/components/access-dialog";
import { ElapsedSince } from "@/components/elapsed-since";
import { exportAuditAction } from "@/lib/admin-actions";
import { orgStatus, STATUS_BADGE, type OrgStatusKey } from "@/lib/org-status";
import { formatDate, maskCnpj } from "@/lib/format";
import type { AdminOrg } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const FILTERS: { key: "all" | OrgStatusKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Informações pendentes" },
  { key: "active", label: "Ativas" },
  { key: "inactive", label: "Inativas" },
];

const PAGE_SIZE = 25;

type SortKey = "cnpj" | "razao" | "status" | "tempo" | "created";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "cnpj", label: "CNPJ" },
  { key: "razao", label: "Razão social" },
  { key: "status", label: "Status" },
  { key: "tempo", label: "Tempo em análise" },
  { key: "created", label: "Criada" },
];

function csvCell(v: string): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

// Sort proxy for "tempo em análise" without a render-time clock: longer elapsed ⇔ earlier
// kyb_forwarded_at, so -timestamp orders identically to elapsed. Non-pending rows have no
// elapsed and sort at the short end.
function tempoProxy(o: AdminOrg, key: OrgStatusKey): number {
  return o.kyb_forwarded_at && key === "pending" ? -Date.parse(o.kyb_forwarded_at) : -Infinity;
}

export function OrgsTable({ orgs }: { orgs: AdminOrg[] }) {
  const [filter, setFilter] = useState<"all" | OrgStatusKey>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [exporting, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  const withStatus = useMemo(() => orgs.map((o) => ({ o, s: orgStatus(o) })), [orgs]);

  const counts = useMemo(
    () =>
      withStatus.reduce<Record<string, number>>((acc, { s }) => {
        acc[s.key] = (acc[s.key] ?? 0) + 1;
        return acc;
      }, {}),
    [withStatus],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = search.replace(/\D/g, "");
    let rows = withStatus;
    if (filter !== "all") rows = rows.filter(({ s }) => s.key === filter);
    if (q) {
      rows = rows.filter(
        ({ o }) =>
          o.razao_social.toLowerCase().includes(q) ||
          (qDigits.length > 0 && o.cnpj.replace(/\D/g, "").includes(qDigits)),
      );
    }
    if (from) rows = rows.filter(({ o }) => o.created_at.slice(0, 10) >= from);
    if (to) rows = rows.filter(({ o }) => o.created_at.slice(0, 10) <= to);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "cnpj":
          cmp = a.o.cnpj.localeCompare(b.o.cnpj);
          break;
        case "razao":
          cmp = a.o.razao_social.localeCompare(b.o.razao_social, "pt-BR");
          break;
        case "status":
          cmp = a.s.label.localeCompare(b.s.label, "pt-BR");
          break;
        case "tempo":
          cmp = tempoProxy(a.o, a.s.key) - tempoProxy(b.o, b.s.key);
          break;
        case "created":
          cmp = Date.parse(a.o.created_at) - Date.parse(b.o.created_at);
          break;
      }
      return cmp * dir;
    });
  }, [withStatus, filter, search, from, to, sortKey, sortDir]);

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
      setSortDir(key === "created" || key === "tempo" ? "desc" : "asc");
    }
  }

  function exportCsv() {
    setExportError(null);
    // Audit FIRST, download after (PRD-04 §3): the full-CNPJ export is only permitted
    // because it is audited, so a failed audit write must block the file, not trail it.
    startExport(async () => {
      // A thrown action inside a transition would bubble to the error boundary and blank the
      // whole page; keep every failure inline so the grid survives.
      try {
        const res = await exportAuditAction({
          entity: "orgs",
          filter: {
            status: filter,
            search: search.trim() || undefined,
            from: from || undefined,
            to: to || undefined,
          },
          row_count: filtered.length,
        });
        if ("error" in res) {
          setExportError(`Não foi possível registrar a exportação na auditoria: ${res.error}`);
          return;
        }
        const header = ["CNPJ", "Razão social", "Status", "Admissão", "Criada"];
        const lines = [
          header,
          ...filtered.map(({ o, s }) => [
            o.cnpj,
            o.razao_social,
            s.label,
            o.admission_state ?? "",
            formatDate(o.created_at),
          ]),
        ];
        const csv = lines.map((r) => r.map(csvCell).join(",")).join("\r\n");
        // BOM so Excel (pt-BR) reads UTF-8 accents correctly.
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `empresas-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setExportError(
          `Falha ao exportar: ${e instanceof Error ? e.message : "erro desconhecido"}. Tente novamente.`,
        );
      }
    });
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-input/30 pl-9 pr-2.5 text-sm text-warm-100 outline-none transition-colors placeholder:text-warm-500 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const dateClass =
    "h-9 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? orgs.length : counts[f.key] ?? 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(0);
              }}
              aria-pressed={active}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
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
          <label htmlFor="orgs-search" className="mb-1 block text-xs text-warm-400">
            Buscar por CNPJ ou razão social
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-warm-500"
              aria-hidden
            />
            <input
              id="orgs-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Ex.: 12.345.678 ou Empresa LTDA"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="orgs-from" className="mb-1 block text-xs text-warm-400">
            Criada de
          </label>
          <input
            id="orgs-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
            className={dateClass}
          />
        </div>
        <div>
          <label htmlFor="orgs-to" className="mb-1 block text-xs text-warm-400">
            até
          </label>
          <input
            id="orgs-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
            className={dateClass}
          />
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || total === 0}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-ink-500 px-3 text-sm text-warm-200 outline-none transition-colors hover:bg-ink-700 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </button>
      </div>
      {exportError && <p className="text-xs text-clay-500">{exportError}</p>}

      {total === 0 ? (
        <p className="text-sm text-warm-500">Nenhuma empresa neste filtro.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-ink-500">
            <table className="w-full text-sm">
              <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  {COLUMNS.map((c) => {
                    const isSorted = sortKey === c.key;
                    const Icon = !isSorted ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
                    return (
                      <th
                        key={c.key}
                        aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                        className="px-4 py-3 font-medium"
                      >
                        <button
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase tracking-wide outline-none transition-colors hover:text-warm-200 focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {c.label}
                          <Icon className={cn("size-3.5", isSorted ? "text-gold-500" : "text-warm-600")} aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 font-medium">Detalhe</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500">
                {pageRows.map(({ o, s }) => (
                  <tr key={o.id} className="text-warm-200">
                    <td className="px-4 py-3 font-mono text-xs">{maskCnpj(o.cnpj)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orgs/${o.id}`}
                        className="rounded-sm font-medium text-warm-100 underline-offset-2 outline-none transition-colors hover:text-gold-500 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {o.razao_social}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          STATUS_BADGE[s.key],
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-warm-500">{s.reason}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-warm-300">
                      {s.key === "pending" ? <ElapsedSince since={o.kyb_forwarded_at} /> : "—"}
                    </td>
                    <td className="px-4 py-3 text-warm-400">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orgs/${o.id}`}
                        className="rounded-sm text-gold-500 underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        Abrir →
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <AccessDialog org={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-warm-400">
            <span>
              {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
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
