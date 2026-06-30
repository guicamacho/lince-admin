import { listOrgs } from "@/lib/admin-api";
import { OrgsTable } from "@/components/orgs-table";

export default async function OrgsPage() {
  const orgs = await listOrgs();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Empresas</h1>
        <p className="mt-1 text-sm text-warm-400">
          Registro de empresas (PJ) e seus status. Decisões da Avenia registradas aqui.
        </p>
      </div>
      <OrgsTable orgs={orgs} />
    </div>
  );
}
