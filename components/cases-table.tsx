"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown, MessageSquare, Search } from "lucide-react";
import {
  CASE_STATUSES,
  CASE_STATUS_BADGE,
  CASE_STATUS_LABEL,
  CASE_TYPES,
  CASE_PRIORITY_BADGE,
  caseStatusLabel,
  casePriorityLabel,
  caseTypeLabel,
  type CaseStatusKey,
  type CasePriorityKey,
} from "@/lib/case-status";
import { formatDate, formatDateTime, elapsedLabel } from "@/lib/format";
import type { AdminCase } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type SortKey = "type" | "org" | "status" | "priority" | "last" | "opened";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "org", label: "Empresa" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Prioridade" },
  { key: "last", label: "Última mensagem" },
  { key: "opened", label: "Aberto em" },
];

function ts(s: string | null): number {
  return s ? Date.parse(s) : -Infinity;
}

export function CasesTable({ cases }: { cases: AdminCase[] }) {
  const [status, setStatus] = useState<"all" | CaseStatusKey>("all");
  const [type, setType] = useState<"all" | string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("opened");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const statusCounts = useMemo(
    () =>
      cases.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      }, {}),
    [cases],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = cases;
    if (status !== "all") rows = rows.filter((c) => c.status === status);
    if (type !== "all") rows = rows.filter((c) => c.type === type);
    if (q) {
      rows = rows.filter(
        (c) =>
          (c.org_name ?? "").toLowerCase().includes(q) ||
          (c.summary ?? "").toLowerCase().includes(q) ||
          caseTypeLabel(c.type).toLowerCase().includes(q),
      );
    }
    if (from) rows = rows.filter((c) => c.opened_at.slice(0, 10) >= from);
    if (to) rows = rows.filter((c) => c.opened_at.slice(0, 10) <= to);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "type":
          cmp = caseTypeLabel(a.type).localeCompare(caseTypeLabel(b.type), "pt-BR");
          break;
        case "org":
          cmp = (a.org_name ?? "").localeCompare(b.org_name ?? "", "pt-BR");
          break;
        case "status":
          cmp = caseStatusLabel(a.status).localeCompare(caseStatusLabel(b.status), "pt-BR");
          break;
        case "priority":
          cmp = casePriorityLabel(a.priority).localeCompare(casePriorityLabel(b.priority), "pt-BR");
          break;
        case "last":
          cmp = ts(a.last_message_at) - ts(b.last_message_at);
          break;
        case "opened":
          cmp = ts(a.opened_at) - ts(b.opened_at);
          break;
      }
      return cmp * dir;
    });
  }, [cases, status, type, search, from, to, sortKey, sortDir]);

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
      setSortDir(key === "opened" || key === "last" ? "desc" : "asc");
    }
  }

  const statusFilters: { key: "all" | CaseStatusKey; label: string }[] = [
    { key: "all", label: "Todos" },
    ...CASE_STATUSES.map((s) => ({ key: s, label: CASE_STATUS_LABEL[s] })),
  ];

  const inputClass =
    "h-9 w-full rounded-lg border border-input bg-input/30 pl-9 pr-2.5 text-sm text-warm-100 outline-none transition-colors placeholder:text-warm-500 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const controlClass =
    "h-9 rounded-lg border border-input bg-input/30 px-2.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const count = f.key === "all" ? cases.length : statusCounts[f.key] ?? 0;
          const active = status === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key);
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
          <label htmlFor="cases-search" className="mb-1 block text-xs text-warm-400">
            Buscar por empresa, resumo ou tipo
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-warm-500"
              aria-hidden
            />
            <input
              id="cases-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Ex.: Empresa LTDA ou complementação"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="cases-type" className="mb-1 block text-xs text-warm-400">
            Tipo
          </label>
          <select
            id="cases-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
            className={controlClass}
          >
            <option value="all">Todos os tipos</option>
            {CASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {caseTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cases-from" className="mb-1 block text-xs text-warm-400">
            Aberto de
          </label>
          <input
            id="cases-from"
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
          <label htmlFor="cases-to" className="mb-1 block text-xs text-warm-400">
            até
          </label>
          <input
            id="cases-to"
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
        <p className="text-sm text-warm-500">Nenhum caso neste filtro.</p>
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
                          type="button"
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
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500">
                {pageRows.map((c) => (
                  <tr key={c.id} className="text-warm-200">
                    <td className="px-4 py-3">
                      <Link
                        href={`/compliance/${c.id}`}
                        className="rounded-sm font-medium text-warm-100 underline-offset-2 outline-none transition-colors hover:text-gold-500 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {caseTypeLabel(c.type)}
                      </Link>
                      {c.summary && (
                        <span className="mt-0.5 block max-w-[22rem] truncate text-xs text-warm-500">
                          {c.summary}
                        </span>
                      )}
                      {c.type === "customer_dispute" && c.status !== "closed" && !c.first_admin_response_at && (
                        <span className="mt-1 inline-flex rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-xs text-gold-500">
                          1ª resposta pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-warm-300">{c.org_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          CASE_STATUS_BADGE[c.status as CaseStatusKey] ?? CASE_STATUS_BADGE.closed,
                        )}
                      >
                        {caseStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          CASE_PRIORITY_BADGE[c.priority as CasePriorityKey] ?? CASE_PRIORITY_BADGE.normal,
                        )}
                      >
                        {casePriorityLabel(c.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-warm-400">
                      {c.last_message_at ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-warm-600" aria-hidden />
                          {formatDateTime(c.last_message_at)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-warm-400">{formatDate(c.opened_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/compliance/${c.id}`}
                        className="rounded-sm text-gold-500 underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        Abrir →
                      </Link>
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
