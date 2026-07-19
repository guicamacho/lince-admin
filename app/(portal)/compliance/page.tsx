import { listCases, listOrgs, listReverification } from "@/lib/admin-api";
import { CasesTable } from "@/components/cases-table";
import { ReverificationQueue } from "@/components/reverification-queue";
import { CreateCaseDialog } from "@/components/create-case-dialog";

// Compliance cases (Wave 2 admin §5). Staff-opened cases over the operational taxonomy; the
// customer-visibility wall lives in the backend. listCases() is cache()'d and shared with the
// layout's open-case badge.
export default async function CompliancePage() {
  const [cases, orgs, reverification] = await Promise.all([listCases(), listOrgs(), listReverification()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Compliance</h1>
          <p className="mt-1 text-sm text-warm-400">
            Casos operacionais e correspondência com o cliente. Tipos AML não existem neste fluxo.
          </p>
        </div>
        <CreateCaseDialog orgs={orgs} />
      </div>
      <ReverificationQueue rows={reverification} />
      <CasesTable cases={cases} />
    </div>
  );
}
