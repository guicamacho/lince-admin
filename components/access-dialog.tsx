"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { setOrgAccessAction } from "@/lib/admin-actions";
import { orgStatus } from "@/lib/org-status";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AdminOrg } from "@/lib/admin-api";

type AccessAction = "suspend" | "block" | "reinstate";

/**
 * Per-org access control: suspend / block / reinstate with a required reason (audit-logged
 * by the backend). Uses the Base UI Dialog primitive, which provides focus trap + restore,
 * inert background, and scroll lock. On success the router refresh flips the Status column.
 */
export function AccessDialog({ org }: { org: AdminOrg }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<AccessAction>(defaultAction(org));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const status = orgStatus(org);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setAction(defaultAction(org));
      setReason("");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    if (!reason.trim()) {
      setError("Informe o motivo.");
      return;
    }
    start(async () => {
      const res = await setOrgAccessAction(org.id, { action, reason: reason.trim() });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Acesso
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Gerenciar acesso — {org.razao_social}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-warm-300 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-xs text-warm-400">
            Status atual: {status.label} — {status.reason}.
          </Dialog.Description>
          <div className="space-y-3 overflow-y-auto p-5">
            <div>
              <label htmlFor={`action-${org.id}`} className="block text-xs text-warm-300">
                Ação
              </label>
              <select
                id={`action-${org.id}`}
                value={action}
                onChange={(e) => setAction(e.target.value as AccessAction)}
                disabled={pending}
                className={`mt-1 h-8 ${inputClass}`}
              >
                <option value="suspend">Suspender</option>
                <option value="block">Bloquear</option>
                <option value="reinstate">Reativar</option>
              </select>
            </div>
            <div>
              <label htmlFor={`motivo-${org.id}`} className="block text-xs text-warm-300">
                Motivo (obrigatório — registrado no histórico de auditoria)
              </label>
              <textarea
                id={`motivo-${org.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={pending}
                className={`mt-1 ${inputClass}`}
                placeholder="Descreva o que motivou a mudança de acesso…"
              />
            </div>
            {error && <p className="text-xs text-clay-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close
                disabled={pending}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Dialog.Close>
              <Button
                size="sm"
                variant={action === "reinstate" ? "default" : "destructive"}
                onClick={submit}
                disabled={pending}
              >
                {pending ? "…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Suspend is the natural action for an active org; otherwise offer to reinstate. */
function defaultAction(org: AdminOrg): AccessAction {
  return org.access_status === "active" ? "suspend" : "reinstate";
}
