"use client";

import { useState } from "react";
import { orgStatus, STATUS_BADGE, type OrgStatusKey } from "@/lib/org-status";
import type { AdminOrg } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const FILTERS: { key: "all" | OrgStatusKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Informações pendentes" },
  { key: "active", label: "Ativas" },
  { key: "inactive", label: "Inativas" },
];

export function OrgsTable({ orgs }: { orgs: AdminOrg[] }) {
  const [filter, setFilter] = useState<"all" | OrgStatusKey>("all");

  const withStatus = orgs.map((o) => ({ o, s: orgStatus(o) }));
  const counts = withStatus.reduce<Record<string, number>>((acc, { s }) => {
    acc[s.key] = (acc[s.key] ?? 0) + 1;
    return acc;
  }, {});
  const rows = filter === "all" ? withStatus : withStatus.filter(({ s }) => s.key === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? orgs.length : counts[f.key] ?? 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
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

      {rows.length === 0 ? (
        <p className="text-sm text-warm-500">Nenhuma empresa neste filtro.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-500">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
              <tr>
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Razão social</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detalhe</th>
                <th className="px-4 py-3 font-medium">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-500">
              {rows.map(({ o, s }) => (
                <tr key={o.id} className="text-warm-200">
                  <td className="px-4 py-3 font-mono text-xs">{o.cnpj}</td>
                  <td className="px-4 py-3">{o.razao_social}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        STATUS_BADGE[s.key],
                      )}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-warm-400">{s.reason}</td>
                  <td className="px-4 py-3 text-warm-400">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
