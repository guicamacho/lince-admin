"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideApprovalAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { ApprovalRow } from "@/lib/admin-api";

/**
 * Maker-checker queue card (A4) — forked from approval-card. Approve, or Decline with a
 * required reason. The backend enforces maker-checker (the approver must differ from the
 * requester) and CAS; those come back as neutral messages. On success the router refresh
 * drops the row and updates the sidebar badge.
 */
const ACTION_LABELS: Record<string, string> = {
  org_block: "Bloqueio de empresa",
  admission_relay: "Relay de admissão",
  reversal: "Estorno",
  role_grant: "Concessão de papel",
};

export function ApprovalQueueCard({ approval }: { approval: ApprovalRow }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "approved" | "declined">(null);
  const [pending, start] = useTransition();

  const actionLabel = ACTION_LABELS[approval.action_type] ?? approval.action_type;
  const requestReason =
    typeof approval.payload?.reason === "string" ? approval.payload.reason : null;

  function submit(decision: "approved" | "declined") {
    setError(null);
    if (decision === "declined" && !reason.trim()) {
      setError("Informe o motivo da recusa.");
      return;
    }
    start(async () => {
      const res = await decideApprovalAction(approval.id, {
        decision,
        remark: decision === "declined" ? reason.trim() : undefined,
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
        <span className="font-medium text-warm-100">{actionLabel}</span>{" "}
        <span className={done === "approved" ? "text-emerald-500" : "text-clay-500"}>
          {done === "approved" ? "aprovada e executada." : "recusada."}
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
          <p className="truncate font-medium text-warm-100">{actionLabel}</p>
          <p className="font-mono text-xs text-warm-400">Alvo: {approval.target_ref}</p>
          {requestReason && (
            <p className="mt-1 text-xs text-warm-300">Motivo informado: {requestReason}</p>
          )}
          <p className="mt-1 text-xs text-warm-500">
            Solicitado por {approval.requested_by_name ?? "—"} em{" "}
            {formatDateTime(approval.requested_at)}
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

      {declining && (
        <div className="space-y-2">
          <label htmlFor={`reason-${approval.id}`} className="block text-xs text-warm-300">
            Motivo da recusa (obrigatório — registrado no histórico de auditoria)
          </label>
          <textarea
            id={`reason-${approval.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
            className={inputClass}
            placeholder="Descreva por que esta ação não deve ser executada…"
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
            <Button size="sm" variant="destructive" onClick={() => submit("declined")} disabled={pending}>
              {pending ? "…" : "Confirmar recusa"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-clay-500">{error}</p>}
    </div>
  );
}
