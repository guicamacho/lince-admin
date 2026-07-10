"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { raiseRfiAction } from "@/lib/admin-actions";
import { buttonVariants, Button } from "@/components/ui/button";

/**
 * Relay an Avenia EDD info request to a company. The message is shown VERBATIM to the customer
 * on their onboarding screen (they can reply there), and the org moves to rfi_required. Only
 * offered for states where the transition is legal (vendor_pending / kyb_in_progress /
 * rfi_required — follow-up round). Base UI Dialog: focus trap, inert background, scroll lock.
 */
export function RfiDialog({ orgId, razaoSocial }: { orgId: string; razaoSocial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMessage("");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    if (!message.trim()) {
      setError("Escreva a mensagem para o cliente.");
      return;
    }
    start(async () => {
      const res = await raiseRfiAction(orgId, message);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Solicitar informações
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink-900/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-10 z-50 flex max-h-[80vh] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700 shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-ink-500 px-5 py-4">
            <Dialog.Title className="font-display text-lg font-bold text-warm-100">
              Solicitar informações — {razaoSocial}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-warm-300 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-3 text-xs text-warm-400">
            Relate o pedido de informações da Avenia (EDD). O texto é exibido ao cliente na tela de
            onboarding, onde ele pode responder. A empresa passa para &quot;informações pendentes&quot;.
          </Dialog.Description>
          <div className="space-y-3 overflow-y-auto p-5">
            <label htmlFor={`rfi-${orgId}`} className="block text-xs text-warm-300">
              Mensagem ao cliente
            </label>
            <textarea
              id={`rfi-${orgId}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              disabled={pending}
              placeholder="Ex.: Para aumentar seu limite, envie o faturamento dos últimos 12 meses e o contrato social atualizado."
              className="w-full rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {error && <p className="text-sm text-clay-500">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-500 px-5 py-4">
            <Dialog.Close className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</Dialog.Close>
            <Button size="sm" onClick={submit} disabled={pending} className="cursor-pointer">
              {pending ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
