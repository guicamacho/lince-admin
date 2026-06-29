import { listOrgs } from "@/lib/admin-api";
import { ApproveButton } from "./approve-button";

// AD-6 — the Avenia-verdict relay. The one wired action in the v1 skeleton: record
// Avenia's decision → the backend activates the org (audit-logged as a relay).
export default async function OnboardingPage() {
  const orgs = await listOrgs();
  const pending = orgs.filter((o) => o.state !== "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Onboarding &amp; KYB</h1>
        <p className="mt-1 max-w-2xl text-sm text-warm-400">
          Registre a decisão da Avenia para ativar a empresa. Sob o Modelo A, isto{" "}
          <span className="text-warm-200">registra a decisão da Avenia</span> — não é uma decisão da
          Lince.
        </p>
      </div>

      {orgs.length === 0 ? (
        <p className="text-sm text-warm-500">
          Nenhuma empresa encontrada. Verifique a conexão com o backend e o ADMIN_SERVICE_TOKEN.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-500">
          <table className="w-full text-sm">
            <thead className="bg-ink-800 text-left text-xs uppercase tracking-wide text-warm-500">
              <tr>
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Razão social</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Admissão</th>
                <th className="px-4 py-3 font-medium">Encaminhado</th>
                <th className="px-4 py-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-500">
              {orgs.map((o) => (
                <tr key={o.id} className="text-warm-200">
                  <td className="px-4 py-3 font-mono text-xs">{o.cnpj}</td>
                  <td className="px-4 py-3">{o.razao_social}</td>
                  <td className="px-4 py-3">{o.state}</td>
                  <td className="px-4 py-3 text-warm-400">{o.admission_state ?? "—"}</td>
                  <td className="px-4 py-3 text-warm-400">
                    {o.kyb_forwarded_at
                      ? new Date(o.kyb_forwarded_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.state === "active" ? (
                      <span className="text-xs text-emerald-500">Ativa</span>
                    ) : (
                      <ApproveButton orgId={o.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending.length > 0 && (
        <p className="text-xs text-warm-500">{pending.length} empresa(s) aguardando decisão.</p>
      )}
    </div>
  );
}
