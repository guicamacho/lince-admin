import Link from "next/link";
import { elapsedLabel, maskCnpj, formatDate } from "@/lib/format";
import type { AgingRow } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/**
 * Presentational admission-aging queue (A3). Rows arrive pre-sorted by elapsed desc from the
 * backend; each carries a server-computed wall-clock elapsed + breach flag. `limit` renders a
 * dashboard preview; omit it for the full /admissions list.
 */
export function AgingQueue({
  rows,
  thresholdDays,
  limit,
}: {
  rows: AgingRow[];
  thresholdDays: number;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (shown.length === 0) {
    return <p className="text-sm text-warm-500">Nenhuma empresa aguardando decisão da Avenia.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-500">
      <table className="w-full text-sm">
        <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
          <tr>
            <th className="px-4 py-3 font-medium">Empresa</th>
            <th className="px-4 py-3 font-medium">Encaminhada</th>
            <th className="px-4 py-3 font-medium">Tempo em análise</th>
            <th className="px-4 py-3 font-medium">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-500">
          {shown.map((r) => (
            <tr key={r.org_id} className="text-warm-200">
              <td className="px-4 py-3">
                <Link
                  href={`/orgs/${r.org_id}`}
                  className="rounded-sm font-medium text-warm-100 underline-offset-2 outline-none transition-colors hover:text-gold-500 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {r.razao_social}
                </Link>
                <span className="block font-mono text-xs text-warm-500">{maskCnpj(r.cnpj)}</span>
              </td>
              <td className="px-4 py-3 text-warm-400">{formatDate(r.kyb_forwarded_at)}</td>
              <td className="px-4 py-3 tabular-nums text-warm-200">
                {elapsedLabel(r.elapsed_seconds)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                    r.breached
                      ? "border-clay-500/30 bg-clay-500/10 text-clay-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
                  )}
                >
                  {r.breached ? `Fora do SLA (${thresholdDays}d)` : "Dentro do SLA"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
