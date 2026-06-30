"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle, X } from "lucide-react";
import { ApprovalCard } from "@/components/approval-card";
import type { AdminOrg } from "@/lib/admin-api";

/**
 * Persistent banner (shown once logged in) listing companies awaiting Avenia's verdict.
 * Click → modal with each company's Approve / Decline (decline needs a reason). Uses the
 * Base UI Dialog primitive, which provides focus trap + restore, inert background, and
 * scroll lock. Decisions are recorded by the backend and reflected in the Empresas list.
 */
export function PendingBanner({ orgs }: { orgs: AdminOrg[] }) {
  if (orgs.length === 0) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-gold-500/30 bg-gold-500/10 px-5 py-2.5 text-left text-sm text-warm-100 transition-colors hover:bg-gold-500/15">
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-gold-500" aria-hidden />
          <span>
            <strong className="font-semibold">{orgs.length}</strong>{" "}
            {orgs.length === 1
              ? "empresa aguardando decisão da Avenia"
              : "empresas aguardando decisão da Avenia"}
          </span>
        </span>
        <span className="shrink-0 font-medium text-gold-500">Revisar →</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Empresas aguardando decisão
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-warm-300 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-xs text-warm-400">
            Registre a decisão da Avenia (Modelo A). Recusar exige um motivo, gravado no histórico de
            auditoria.
          </Dialog.Description>
          <div className="space-y-3 overflow-y-auto p-5">
            {orgs.map((o) => (
              <ApprovalCard key={o.id} org={o} />
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
