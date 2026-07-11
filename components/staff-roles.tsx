"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import type { AdminStaff } from "@/lib/admin-api";
import { setStaffRolesAction } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";

const ROLES: { key: string; label: string }[] = [
  { key: "superadmin", label: "Superadmin" },
  { key: "compliance", label: "Compliance" },
  { key: "support", label: "Suporte" },
  { key: "treasury_ops", label: "Tesouraria" },
  { key: "read_only", label: "Somente leitura" },
];

function StaffRow({ staff }: { staff: AdminStaff }) {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>(staff.roles);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = roles.slice().sort().join(",") !== staff.roles.slice().sort().join(",");

  function toggle(role: string) {
    setError(null);
    setSaved(false);
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await setStaffRolesAction(staff.id, roles);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-warm-200">{staff.name}</span>
        <span className="text-sm text-warm-500">{staff.email}</span>
        {!staff.is_active && <span className="text-xs text-clay-500">inativo</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((r) => {
          const on = roles.includes(r.key);
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(r.key)}
              disabled={pending}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                on
                  ? "border-gold-400/30 bg-gold-400/10 text-gold-300"
                  : "border-ink-500 bg-ink-800 text-warm-500 hover:text-warm-300",
              )}
            >
              {r.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-bold text-ink-900 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Salvar
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-clay-500">{error}</p>}
      {saved && !error && <p role="status" className="text-xs text-emerald-500">Papéis atualizados.</p>}
    </li>
  );
}

export function StaffRoles({ staff, canManage }: { staff: AdminStaff[]; canManage: boolean }) {
  if (!canManage) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-ink-500 bg-ink-700 p-5 text-sm text-warm-400">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-warm-500" aria-hidden />
        <p>Somente superadmins podem gerenciar papéis da equipe interna.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-ink-500 rounded-xl border border-ink-500 bg-ink-700 px-5">
      {staff.map((s) => (
        <StaffRow key={s.id} staff={s} />
      ))}
    </ul>
  );
}
