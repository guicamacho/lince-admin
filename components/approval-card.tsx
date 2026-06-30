"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordVerdictAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import type { AdminOrg } from "@/lib/admin-api";

/** One org's relay control: Approve, or Decline with a required reason. Optional Avenia ref. */
export function ApprovalCard({ org }: { org: AdminOrg }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [aveniaRef, setAveniaRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "approved" | "rejected">(null);
  const [pending, start] = useTransition();

  function submit(decision: "approved" | "rejected") {
    setError(null);
    if (decision === "rejected" && !reason.trim()) {
      setError("Informe o motivo da recusa.");
      return;
    }
    start(async () => {
      const res = await recordVerdictAction(org.id, {
        decision,
        remark: decision === "rejected" ? reason.trim() : undefined,
        aveniaReference: aveniaRef.trim() || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDone(decision);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-ink-500 bg-ink-800 p-4 text-sm">
        <span className="font-medium text-warm-100">{org.razao_social}</span>{" "}
        <span className={done === "approved" ? "text-emerald-500" : "text-clay-500"}>
          {done === "approved" ? "aprovada." : "recusada."}
        </span>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm text-warm-100 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-3 rounded-lg border border-ink-500 bg-ink-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-warm-100">{org.razao_social}</p>
          <p className="font-mono text-xs text-warm-400">{org.cnpj}</p>
          <p className="mt-1 text-xs text-warm-500">
            Encaminhado à Avenia:{" "}
            {org.kyb_forwarded_at ? new Date(org.kyb_forwarded_at).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
        {!declining && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDeclining(true)} disabled={pending}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => submit("approved")} disabled={pending}>
              {pending ? "…" : "Aprovar"}
            </Button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`ref-${org.id}`} className="block text-xs text-warm-400">
          Referência da Avenia (opcional)
        </label>
        <input
          id={`ref-${org.id}`}
          value={aveniaRef}
          onChange={(e) => setAveniaRef(e.target.value)}
          disabled={pending}
          className={`mt-1 h-8 ${inputClass}`}
          placeholder="ID / ofício da decisão da Avenia"
        />
      </div>

      {declining && (
        <div className="space-y-2">
          <label htmlFor={`reason-${org.id}`} className="block text-xs text-warm-300">
            Motivo da recusa (obrigatório — registrado no histórico de auditoria)
          </label>
          <textarea
            id={`reason-${org.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Descreva o que ocorreu (decisão da Avenia)…"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDeclining(false);
                setReason("");
                setError(null);
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => submit("rejected")} disabled={pending}>
              {pending ? "…" : "Confirmar recusa"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-clay-500">{error}</p>}
    </div>
  );
}
