import { AlertTriangle, Clock } from "lucide-react";
import { getAdmissionAging } from "@/lib/admin-api";
import { MetricTile } from "@/components/metric-tile";
import { AgingQueue } from "@/components/aging-queue";
import { daysLabel } from "@/lib/format";

// Full admission-aging list (A3). Elapsed is wall-clock per PRD-04 §4.3; the SLA threshold is
// env ADMISSION_SLA_DAYS on the backend. Rows arrive sorted by elapsed desc.
export default async function AdmissionsPage() {
  const aging = await getAdmissionAging();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Admissões</h1>
        <p className="mt-1 text-sm text-warm-400">
          Empresas encaminhadas à Avenia, ordenadas por tempo em análise.
        </p>
      </div>

      {!aging ? (
        <p className="text-sm text-warm-500">Não foi possível carregar a fila de admissões.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricTile label="Na fila" value={aging.pending_count} icon={Clock} />
            <MetricTile
              label="Fora do SLA"
              value={aging.breach_count}
              tone={aging.breach_count > 0 ? "bad" : "ok"}
              hint={`Limite: ${aging.threshold_days} dias`}
              icon={AlertTriangle}
            />
            <MetricTile
              label="Latência p50 / p90"
              value={`${daysLabel(aging.latency.p50_days)} / ${daysLabel(aging.latency.p90_days)}`}
              hint={`${aging.latency.n} admissões (90d)`}
            />
          </div>
          <AgingQueue rows={aging.pending} thresholdDays={aging.threshold_days} />
        </>
      )}
    </div>
  );
}
