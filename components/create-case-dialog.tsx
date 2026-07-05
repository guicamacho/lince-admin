"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
import { createCaseAction } from "@/lib/admin-actions";
import {
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_PRIORITY_LABEL,
  caseTypeLabel,
} from "@/lib/case-status";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AdminOrg } from "@/lib/admin-api";

/**
 * Open a compliance case (staff-initiated — reply-only model). The type picker offers
 * OPERATIONAL types only; no AML type exists to list and the backend refuses one. On success
 * we navigate straight to the new case. Base UI Dialog gives focus trap + restore + scroll lock.
 */
export function CreateCaseDialog({ orgs }: { orgs: AdminOrg[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [type, setType] = useState<string>(CASE_TYPES[0]);
  const [priority, setPriority] = useState<string>("normal");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setOrgId("");
      setType(CASE_TYPES[0]);
      setPriority("normal");
      setSummary("");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createCaseAction({
        type,
        org_id: orgId || undefined,
        priority,
        summary: summary.trim() || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.push(`/compliance/${res.id}`);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={buttonVariants({ variant: "default", size: "lg" })}>
        <Plus className="size-4" aria-hidden />
        Novo caso
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Abrir novo caso
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-warm-300 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="space-y-3 overflow-y-auto p-5">
            <div>
              <label htmlFor="case-type" className="block text-xs text-warm-300">
                Tipo do caso
              </label>
              <select
                id="case-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={pending}
                className={`mt-1 h-8 ${inputClass}`}
              >
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {caseTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="case-org" className="block text-xs text-warm-300">
                Empresa
              </label>
              <select
                id="case-org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={pending}
                className={`mt-1 h-8 ${inputClass}`}
              >
                <option value="">— Sem empresa (interno) —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.razao_social}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="case-priority" className="block text-xs text-warm-300">
                Prioridade
              </label>
              <select
                id="case-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={pending}
                className={`mt-1 h-8 ${inputClass}`}
              >
                {CASE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CASE_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="case-summary" className="block text-xs text-warm-300">
                Resumo (opcional)
              </label>
              <textarea
                id="case-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                disabled={pending}
                className={`mt-1 ${inputClass}`}
                placeholder="Descreva brevemente o motivo do caso…"
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-clay-500">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close disabled={pending} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Cancelar
              </Dialog.Close>
              <Button size="sm" variant="default" onClick={submit} disabled={pending}>
                {pending ? "…" : "Abrir caso"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
