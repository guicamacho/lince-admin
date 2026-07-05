import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCaseDetail } from "@/lib/admin-api";
import {
  CASE_STATUS_BADGE,
  caseStatusLabel,
  casePriorityLabel,
  caseTypeLabel,
  type CaseStatusKey,
} from "@/lib/case-status";
import { CaseThread } from "@/components/case-thread";
import { CaseMessageDialog } from "@/components/case-message-dialog";
import { CaseActions } from "@/components/case-actions";
import { formatCnpj, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Case 360 (Wave 2 admin §5). Full thread incl. internal notes — staff are inside the boundary.
export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCaseDetail(id);
  if (!detail) notFound();

  const { case: c, org, messages } = detail;
  const statusKey = (["open", "in_review", "escalated", "closed"].includes(c.status)
    ? c.status
    : "closed") as CaseStatusKey;

  return (
    <div className="space-y-6">
      <Link
        href="/compliance"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-warm-400 outline-none transition-colors hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Compliance
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl">{caseTypeLabel(c.type)}</h1>
          <p className="mt-1 text-sm text-warm-400">{org ? org.razao_social : "Caso interno (sem empresa)"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-3 py-1 text-sm font-medium",
              CASE_STATUS_BADGE[statusKey],
            )}
          >
            {caseStatusLabel(c.status)}
          </span>
          <CaseMessageDialog caseId={c.id} caseType={c.type} />
          <CaseActions caseId={c.id} status={c.status} resolution={c.resolution} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Caso">
          <Field label="Tipo">{caseTypeLabel(c.type)}</Field>
          <Field label="Status">{caseStatusLabel(c.status)}</Field>
          <Field label="Prioridade">{casePriorityLabel(c.priority)}</Field>
          <Field label="Aberto em">{formatDateTime(c.opened_at)}</Field>
          <Field label="Fechado em">{formatDateTime(c.closed_at)}</Field>
          <Field label="Atribuído a">{c.assigned_admin_id ?? "—"}</Field>
          <Field label="Resumo">{c.summary ?? "—"}</Field>
          <Field label="Resolução">{c.resolution ?? "—"}</Field>
        </Section>

        <Section title="Empresa">
          {org ? (
            <>
              <Field label="Razão social">{org.razao_social}</Field>
              <Field label="CNPJ">{formatCnpj(org.cnpj)}</Field>
              <Field label="Estado">{org.state}</Field>
            </>
          ) : (
            <p className="text-sm text-warm-500">Caso interno — sem empresa vinculada.</p>
          )}
        </Section>
      </div>

      <section className="space-y-3 rounded-xl border border-ink-500 bg-ink-700 p-5">
        <h2 className="font-display text-lg">Conversa</h2>
        <CaseThread messages={messages} />
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-ink-500 bg-ink-700 p-5">
      <h2 className="font-display text-lg">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-warm-500">{label}</dt>
      <dd className="break-words text-sm text-warm-100">{children}</dd>
    </div>
  );
}
