import { Suspense } from "react";
import { listFxSpreads, listOrgs } from "@/lib/admin-api";
import { PricingEditor } from "@/components/pricing-editor";

// Preços (PRD-09): the per-client commission schedule — spreads in bps that Avenia applies
// as its Markup Fee. Editing is superadmin-only (server-enforced) and always audited.
// Display/execution of differentiated rates stays flag-gated until the §2 gates clear.
export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Preços</h1>
        <p className="mt-1 text-sm text-warm-400">
          Margem por cliente (bps sobre a taxa base), aplicada pela Avenia como Markup Fee.
          Alterações são auditadas; a exibição diferenciada fica atrás de flag até os gates do PRD-09.
        </p>
      </div>
      <Suspense fallback={<PricingSkeleton />}>
        <PricingContent />
      </Suspense>
    </div>
  );
}

async function PricingContent() {
  const [spreads, orgs] = await Promise.all([listFxSpreads(), listOrgs()]);
  return <PricingEditor spreads={spreads} orgs={orgs.map((o) => ({ id: o.id, name: o.razao_social }))} />;
}

function PricingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
      <div className="h-56 animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
    </div>
  );
}
