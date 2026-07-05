"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { updateCaseStatusAction } from "@/lib/admin-actions";
import { CASE_STATUSES, CASE_STATUS_LABEL, type CaseStatusKey } from "@/lib/case-status";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Change a case's status, capturing a resolution when closing it (required — backend enforces,
 * re-checked here for an inline error). Assign-to-admin is intentionally NOT here: no admin
 * roster endpoint exists to feed a picker; the assignCase binding is ready for when one ships.
 */
export function CaseActions({
  caseId,
  status,
  resolution,
}: {
  caseId: string;
  status: string;
  resolution: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<string>(status);
  const [note, setNote] = useState(resolution ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const closing = next === "closed";

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setNext(status);
      setNote(resolution ?? "");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    if (closing && !note.trim()) {
      setError("Informe a resolução para fechar o caso.");
      return;
    }
    start(async () => {
      const res = await updateCaseStatusAction(caseId, {
        status: next,
        resolution: closing ? note.trim() : undefined,
      });
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
      <Dialog.Trigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Alterar status
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Alterar status do caso
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
              <label htmlFor="case-status" className="block text-xs text-warm-300">
                Status
              </label>
              <select
                id="case-status"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                disabled={pending}
                className={`mt-1 h-8 ${inputClass}`}
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CASE_STATUS_LABEL[s as CaseStatusKey]}
                  </option>
                ))}
              </select>
            </div>
            {closing && (
              <div>
                <label htmlFor="case-resolution" className="block text-xs text-warm-300">
                  Resolução (obrigatória para fechar)
                </label>
                <textarea
                  id="case-resolution"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  disabled={pending}
                  className={`mt-1 ${inputClass}`}
                  placeholder="Descreva como o caso foi resolvido…"
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-xs text-clay-500">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close disabled={pending} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Cancelar
              </Dialog.Close>
              <Button
                size="sm"
                variant={closing ? "destructive" : "default"}
                onClick={submit}
                disabled={pending}
              >
                {pending ? "…" : closing ? "Fechar caso" : "Salvar"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
