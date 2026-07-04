import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "@/lib/admin-api";

/**
 * The A1 §3 "Status History" primitive — a presentational timeline over the org's audit_log
 * rows (event + before/after/actor/reason from the payload). Read-only; the payload shapes
 * vary by event, so we surface the common keys and fall back to just the event otherwise.
 */
const EVENT_LABELS: Record<string, string> = {
  "org.created": "Empresa criada",
  "org.access_changed": "Acesso alterado",
  "admission.recorded": "Decisão da Avenia registrada",
  "admission.relayed": "Decisão da Avenia registrada",
  "consent.accepted": "Consentimento aceito",
  "admin.export": "Exportação de dados",
};

function payloadBits(payload: unknown): { label: string; value: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const bits: { label: string; value: string }[] = [];
  const push = (label: string, v: unknown) => {
    if (v != null && v !== "") bits.push({ label, value: String(v) });
  };
  push("De", p.from);
  push("Para", p.to);
  push("Ação", p.action);
  push("Decisão", p.decision);
  push("Origem", p.source);
  push("Motivo", p.reason ?? p.remark);
  return bits;
}

export function StatusHistory({ audit }: { audit: AuditRow[] }) {
  if (audit.length === 0) {
    return <p className="text-sm text-warm-500">Sem registros de auditoria.</p>;
  }
  return (
    <ol className="space-y-3">
      {audit.map((r, i) => {
        const bits = payloadBits(r.payload);
        return (
          <li key={i} className="relative border-l border-ink-500 pl-4">
            <span
              className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-gold-500/70"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium text-warm-100">
                {EVENT_LABELS[r.event] ?? r.event}
              </span>
              <time className="text-xs text-warm-500">{formatDateTime(r.created_at)}</time>
            </div>
            <p className="text-xs text-warm-500">
              {r.actor_type}
              {r.actor_id ? ` · ${r.actor_id}` : ""}
            </p>
            {bits.length > 0 && (
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                {bits.map((b, j) => (
                  <div key={j} className="flex gap-1">
                    <dt className="text-warm-500">{b.label}:</dt>
                    <dd className="text-warm-300">{b.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ol>
  );
}
