import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Gauge, Timer } from "lucide-react";
import { getAdmissionAging } from "@/lib/admin-api";
import { MetricTile } from "@/components/metric-tile";
import { AgingQueue } from "@/components/aging-queue";
import { daysLabel } from "@/lib/format";

// PRD-04 §4.3/§10 Group A — admission aging + latency, day-one. Wall-clock elapsed.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Painel</h1>
        <p className="mt-1 text-sm text-warm-400">
          Console interno da Lince — operações, compliance e tesouraria.
        </p>
      </div>
      <Suspense fallback={<OverviewSkeleton />}>
        <AdmissionsOverview />
      </Suspense>
    </div>
  );
}

async function AdmissionsOverview() {
  const aging = await getAdmissionAging();
  if (!aging) {
    return (
      <p className="text-sm text-warm-500">
        Não foi possível carregar os indicadores de admissão.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Aguardando decisão"
          value={aging.pending_count}
          hint="Empresas na fila da Avenia"
          icon={Clock}
        />
        <MetricTile
          label="Fora do SLA"
          value={aging.breach_count}
          tone={aging.breach_count > 0 ? "bad" : "ok"}
          hint={`Limite: ${aging.threshold_days} dias`}
          icon={AlertTriangle}
        />
        <MetricTile
          label="Latência p50"
          value={daysLabel(aging.latency.p50_days)}
          hint={`${aging.latency.n} admissões (90d)`}
          icon={Timer}
        />
        <MetricTile
          label="Latência p90"
          value={daysLabel(aging.latency.p90_days)}
          hint="Tempo até a decisão"
          icon={Gauge}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Empresas em admissão</h2>
          <Link
            href="/admissions"
            className="rounded-sm text-sm text-gold-500 underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Ver todas →
          </Link>
        </div>
        <AgingQueue rows={aging.pending} thresholdDays={aging.threshold_days} limit={5} />
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[104px] animate-pulse rounded-xl border border-ink-500 bg-ink-700"
        />
      ))}
    </div>
  );
}
