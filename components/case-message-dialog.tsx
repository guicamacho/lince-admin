"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { MessageSquarePlus, X } from "lucide-react";
import { postCaseMessageAction } from "@/lib/admin-actions";
import { CUSTOMER_FACING_CASE_TYPES } from "@/lib/case-status";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Post a staff message on a case. By default it is an INTERNAL note (never leaves the boundary).
 * The "Enviar ao cliente" checkbox is shown ONLY for customer-facing case types — the UX gate;
 * the real wall is the backend (messages.service refuses a visible message on any other type).
 * A visible message drops a neutral ping into the customer inbox (never the raw text).
 */
export function CaseMessageDialog({ caseId, caseType }: { caseId: string; caseType: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [customerVisible, setCustomerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canBeVisible = CUSTOMER_FACING_CASE_TYPES.has(caseType);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setBody("");
      setCustomerVisible(false);
      setError(null);
    }
  }

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError("Escreva uma mensagem.");
      return;
    }
    start(async () => {
      const res = await postCaseMessageAction(caseId, {
        body: body.trim(),
        customer_visible: canBeVisible && customerVisible,
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
      <Dialog.Trigger className={buttonVariants({ variant: "default", size: "sm" })}>
        <MessageSquarePlus className="size-4" aria-hidden />
        Nova mensagem
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Nova mensagem
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-warm-300 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-xs text-warm-400">
            Por padrão, a mensagem é uma nota interna — visível apenas à equipe.
          </Dialog.Description>
          <div className="space-y-3 overflow-y-auto p-5">
            <div>
              <label htmlFor="case-message-body" className="block text-xs text-warm-300">
                Mensagem
              </label>
              <textarea
                id="case-message-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                disabled={pending}
                className={`mt-1 ${inputClass}`}
                placeholder="Escreva a mensagem…"
              />
            </div>
            {canBeVisible && (
              <label
                htmlFor="case-message-visible"
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-500 bg-ink-800 p-2.5 text-xs text-warm-300"
              >
                <input
                  id="case-message-visible"
                  type="checkbox"
                  checked={customerVisible}
                  onChange={(e) => setCustomerVisible(e.target.checked)}
                  disabled={pending}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
                />
                <span>
                  Enviar ao cliente (visível no painel) — o cliente recebe um aviso neutro e vê
                  esta mensagem na conversa do caso.
                </span>
              </label>
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
              <Button size="sm" variant="default" onClick={submit} disabled={pending}>
                {pending ? "…" : customerVisible && canBeVisible ? "Enviar ao cliente" : "Salvar nota"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
