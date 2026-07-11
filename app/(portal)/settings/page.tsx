import { listAdminStaff } from "@/lib/admin-api";
import { StaffRoles } from "@/components/staff-roles";

// Settings — staff RBAC management (PRD-04 §4.9). listAdminStaff returns ok:false (403) for a
// non-superadmin; the backend is the real gate, the UI just renders accordingly.
export default async function SettingsPage() {
  const { ok, staff } = await listAdminStaff();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl">Configurações</h1>
        <p className="mt-1 text-sm text-warm-500">Equipe interna e papéis de acesso.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Equipe interna</h2>
        <p className="text-xs text-warm-500">
          Papéis definem o que cada membro do back-office pode fazer. A propagação é imediata; a
          remoção do último superadmin é bloqueada.
        </p>
        <StaffRoles staff={staff} canManage={ok} />
      </section>
    </div>
  );
}
