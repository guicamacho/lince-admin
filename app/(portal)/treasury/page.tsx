import { Suspense } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { listRecon, type ReconBreak, type ReconRun } from "@/lib/admin-api";
import { MetricTile } from "@/components/metric-tile";
import { formatDateTime, formatMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

// Tesouraria (PRD-04 §13.3 / AC12): the recon comparator's output — hourly runs of the
// per-subaccount ledger-vs-Avenia balance compare (in-flight tolerant) plus the
// settled-postings match. Breaks link to their recon_break case; resolution flows there.
export default function TreasuryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Tesouraria</h1>
        <p className="mt-1 text-sm text-warm-400">
          Conciliação horária: saldo por subconta (razão × Avenia) e lançamentos de cada transação liquidada.
        </p>
      </div>
      <Suspense fallback={<TreasurySkeleton />}>
        <TreasuryContent />
      </Suspense>
    </div>
  );
}

const BREAK_LABEL: Record<ReconBreak["break_type"], string> = {
  balance_drift: "Divergência de saldo",
  missing_posting: "Lançamento ausente",
  orphan_posting: "Lançamento órfão",
  delivery_gap: "Falha de entrega",
};

const RUN_BADGE: Record<ReconRun["status"], string> = {
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  failed: "border-clay-500/50 bg-clay-500/20 font-semibold text-clay-500",
  running: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  queued: "border-warm-600/30 bg-warm-600/10 text-warm-400",
};

async function TreasuryContent() {
  const { runs, breaks } = await listRecon();
  const last = runs[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile
          label="Divergências abertas"
          value={String(breaks.length)}
          tone={breaks.length > 0 ? "bad" : "ok"}
          icon={breaks.length > 0 ? AlertTriangle : CheckCircle2}
          hint={breaks.length === 0 ? "Razão e Avenia conferem" : "Ação necessária — veja o caso vinculado"}
        />
        <MetricTile
          label="Última conciliação"
          value={last ? formatDateTime(last.started_at) : "—"}
          hint={last ? `${last.summary.orgsChecked ?? 0} subcontas conferidas` : "Aguardando o primeiro ciclo"}
        />
        <MetricTile
          label="Puladas (em trânsito)"
          value={String(last?.summary.skippedInFlight ?? 0)}
          hint="Tolerância a transações em andamento — conferidas no próximo ciclo"
        />
      </div>

      {breaks.length > 0 && (
        <section aria-labelledby="breaks-heading">
          <h2 id="breaks-heading" className="font-display text-lg">Divergências abertas</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-ink-500">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink-500 text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Ativo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Razão (esperado)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Avenia (real)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Detectada</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600">
                {breaks.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-warm-200">{b.razao_social ?? "—"}</td>
                    <td className="px-4 py-3 text-warm-300">{BREAK_LABEL[b.break_type]}</td>
                    <td className="px-4 py-3 font-mono text-xs text-warm-300">{b.asset ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-warm-200">
                      {formatMinor(b.expected_minor === null ? null : Number(b.expected_minor), b.asset)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-warm-200">
                      {formatMinor(b.actual_minor === null ? null : Number(b.actual_minor), b.asset)}
                    </td>
                    <td className="px-4 py-3 text-warm-400">{formatDateTime(b.detected_at)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-clay-500/30 bg-clay-500/10 px-2 py-0.5 text-xs text-clay-500">
                        {b.status === "open" ? "Aberta" : "Em análise"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="font-display text-lg">Ciclos recentes</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-ink-500">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-500 text-xs uppercase tracking-wide text-warm-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Início</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Subcontas</th>
                <th scope="col" className="px-4 py-3 font-medium">Puladas</th>
                <th scope="col" className="px-4 py-3 font-medium">Divergências novas</th>
                <th scope="col" className="px-4 py-3 font-medium">Lançamentos ausentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600">
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-warm-500">
                    Nenhum ciclo ainda — o comparador roda de hora em hora.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-warm-200">{formatDateTime(r.started_at)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs", RUN_BADGE[r.status])}>
                      {r.status === "completed" ? "Concluído" : r.status === "failed" ? "Falhou" : r.status === "running" ? "Em execução" : "Na fila"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-warm-300">{r.summary.orgsChecked ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-warm-300">{r.summary.skippedInFlight ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-warm-300">{r.summary.balanceDrifts ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-warm-300">{r.summary.missingPostings ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TreasurySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-h-[104px] animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
    </div>
  );
}
