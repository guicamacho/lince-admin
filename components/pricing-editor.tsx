"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setFxSpreadAction } from "@/lib/admin-actions";
import { formatDateTime } from "@/lib/format";
import type { FxSpreadRow } from "@/lib/admin-api";

const CELLS: Array<{ pair: "USD" | "EUR"; direction: "buy" | "sell"; label: string }> = [
  { pair: "USD", direction: "buy", label: "USD · compra" },
  { pair: "USD", direction: "sell", label: "USD · venda" },
  { pair: "EUR", direction: "buy", label: "EUR · compra" },
  { pair: "EUR", direction: "sell", label: "EUR · venda" },
];

// Preços editor (PRD-09 §5). Backend enforces superadmin + the 1000 bps cap; this surface
// renders for any staff and surfaces the 403 copy on write.
export function PricingEditor({
  spreads,
  orgs,
}: {
  spreads: FxSpreadRow[];
  orgs: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const defaults = useMemo(() => spreads.filter((s) => s.orgId === null), [spreads]);
  const overrides = useMemo(() => spreads.filter((s) => s.orgId !== null), [spreads]);
  const defaultFor = (pair: string, direction: string) =>
    defaults.find((d) => d.pair === pair && d.direction === direction)?.spreadBps ?? 0;

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [ovOrg, setOvOrg] = useState("");
  const [ovPair, setOvPair] = useState<"USD" | "EUR">("USD");
  const [ovDir, setOvDir] = useState<"buy" | "sell">("buy");
  const [ovBps, setOvBps] = useState("");

  function save(orgId: string | null, pair: string, direction: string, raw: string | null) {
    setError(null);
    setInfo(null);
    const spreadBps = raw === null ? null : Number(raw);
    if (raw !== null && (!Number.isInteger(spreadBps) || spreadBps! < 0)) {
      setError("Informe um inteiro em bps (0–1000).");
      return;
    }
    startTransition(async () => {
      const res = await setFxSpreadAction({ orgId, pair, direction, spreadBps });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setInfo("Salvo e auditado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {(error || info) && (
        <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-clay-500" : "text-emerald-500"}`}>
          {error ?? info}
        </p>
      )}

      <section aria-labelledby="defaults-heading" className="rounded-xl border border-ink-500 p-5">
        <h2 id="defaults-heading" className="font-display text-lg">Padrão global</h2>
        <p className="mt-1 text-sm text-warm-500">Aplica-se a todos os clientes sem override. 0 bps = taxa base (paridade).</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CELLS.map((c) => {
            const key = `${c.pair}:${c.direction}`;
            const current = defaultFor(c.pair, c.direction);
            return (
              <div key={key} className="space-y-1">
                <label htmlFor={`def-${key}`} className="text-xs font-medium tracking-wide text-warm-500 uppercase">
                  {c.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`def-${key}`}
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    defaultValue={current}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    className="w-24 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm text-warm-100 tabular-nums"
                  />
                  <span className="text-xs text-warm-500">bps</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={pending || draft[key] === undefined || Number(draft[key]) === current}
                    onClick={() => save(null, c.pair, c.direction, draft[key] ?? String(current))}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="overrides-heading" className="rounded-xl border border-ink-500 p-5">
        <h2 id="overrides-heading" className="font-display text-lg">Overrides por cliente</h2>
        {overrides.length === 0 ? (
          <p className="mt-2 text-sm text-warm-500">Nenhum override — todos os clientes usam o padrão.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-ink-500 text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Empresa</th>
                  <th scope="col" className="px-3 py-2 font-medium">Par · direção</th>
                  <th scope="col" className="px-3 py-2 font-medium">Spread</th>
                  <th scope="col" className="px-3 py-2 font-medium">Atualizado</th>
                  <th scope="col" className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600">
                {overrides.map((o) => (
                  <tr key={`${o.orgId}:${o.pair}:${o.direction}`}>
                    <td className="px-3 py-2 text-warm-200">{o.razaoSocial ?? o.orgId}</td>
                    <td className="px-3 py-2 text-warm-300">
                      {o.pair} · {o.direction === "buy" ? "compra" : "venda"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-warm-200">{o.spreadBps} bps</td>
                    <td className="px-3 py-2 text-warm-400">{formatDateTime(o.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer text-clay-500"
                        disabled={pending}
                        onClick={() => save(o.orgId, o.pair, o.direction, null)}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-600 pt-4">
          <div className="space-y-1">
            <label htmlFor="ov-org" className="text-xs font-medium tracking-wide text-warm-500 uppercase">Empresa</label>
            <select
              id="ov-org"
              value={ovOrg}
              onChange={(e) => setOvOrg(e.target.value)}
              className="min-w-52 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm text-warm-100"
            >
              <option value="">Selecione…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="ov-pair" className="text-xs font-medium tracking-wide text-warm-500 uppercase">Par</label>
            <select id="ov-pair" value={ovPair} onChange={(e) => setOvPair(e.target.value as "USD" | "EUR")}
              className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm text-warm-100">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="ov-dir" className="text-xs font-medium tracking-wide text-warm-500 uppercase">Direção</label>
            <select id="ov-dir" value={ovDir} onChange={(e) => setOvDir(e.target.value as "buy" | "sell")}
              className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm text-warm-100">
              <option value="buy">compra</option>
              <option value="sell">venda</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="ov-bps" className="text-xs font-medium tracking-wide text-warm-500 uppercase">Spread (bps)</label>
            <input id="ov-bps" type="number" min={0} max={1000} step={1} value={ovBps}
              onChange={(e) => setOvBps(e.target.value)}
              className="w-28 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-sm text-warm-100 tabular-nums" />
          </div>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={pending || !ovOrg || ovBps === ""}
            onClick={() => save(ovOrg, ovPair, ovDir, ovBps)}
          >
            Definir override
          </Button>
        </div>
      </section>
    </div>
  );
}
