import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgDetail, listOrgDocuments } from "@/lib/admin-api";
import { orgStatus, STATUS_BADGE } from "@/lib/org-status";
import { CnpjMask } from "@/components/cnpj-mask";
import { RfiDialog } from "@/components/rfi-dialog";
import { StatusHistory } from "@/components/status-history";

// States from which raising an RFI is a legal transition (backend org.state machine).
const RFI_ELIGIBLE_STATES = new Set(["vendor_pending", "kyb_in_progress", "rfi_required"]);
import { elapsedLabel, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Org 360 read (A2). References + status only (Modelo A); the read is not audited.
export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, documents] = await Promise.all([getOrgDetail(id), listOrgDocuments(id)]);
  if (!detail) notFound();

  const { org, admission, avenia, didit, people, audit } = detail;
  const status = orgStatus(org);

  return (
    <div className="space-y-6">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-warm-400 outline-none transition-colors hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Empresas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl">{org.razao_social}</h1>
          <div className="mt-1">
            <CnpjMask cnpj={org.cnpj} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {RFI_ELIGIBLE_STATES.has(org.state) && (
            <RfiDialog orgId={org.id} razaoSocial={org.razao_social} />
          )}
          <span
            className={cn(
              "inline-flex rounded-full border px-3 py-1 text-sm font-medium",
              STATUS_BADGE[status.key],
            )}
          >
            {status.label} — {status.reason}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Visão geral">
          <Field label="Estado (lifecycle)">{org.state}</Field>
          <Field label="Admissão">{org.admission_state ?? "—"}</Field>
          <Field label="Acesso">{org.access_status}</Field>
          <Field label="Motivo do acesso">{org.access_reason ?? "—"}</Field>
          <Field label="Origem do acesso">{org.access_source ?? "—"}</Field>
          <Field label="Acesso alterado em">{formatDateTime(org.access_changed_at)}</Field>
          <Field label="País">{org.country_code ?? "—"}</Field>
          <Field label="Criada em">{formatDateTime(org.created_at)}</Field>
          <Field label="Ativada em">{formatDateTime(org.activated_at)}</Field>
        </Section>

        <Section title="Admissão">
          <Field label="Autoridade usada">{admission.authority_used ?? "—"}</Field>
          <Field label="Referência externa">{admission.external_ref ?? "—"}</Field>
          <Field label="Encaminhada em">{formatDateTime(admission.submitted_at)}</Field>
          <Field label="Tempo em análise">
            {admission.elapsed_seconds != null
              ? elapsedLabel(admission.elapsed_seconds)
              : admission.recorded_at
                ? "Decidida"
                : "—"}
          </Field>
          <Field label="Registrada por">{admission.recorded_by_name ?? "—"}</Field>
          <Field label="Registrada em">{formatDateTime(admission.recorded_at)}</Field>
        </Section>

        <Section title="Avenia">
          {avenia ? (
            <>
              <Field label="Subconta">{avenia.subaccount_id ?? "—"}</Field>
              <Field label="KYB L1">{avenia.kyb_l1_state ?? "—"}</Field>
              <Field label="PoFC">{avenia.pofc_state ?? "—"}</Field>
              <Field label="USD">{avenia.usd_state ?? "—"}</Field>
              <Field label="EUR">{avenia.eur_state ?? "—"}</Field>
            </>
          ) : (
            <p className="text-sm text-warm-500">Sem conta Avenia.</p>
          )}
        </Section>

        <Section title="Verificação (Didit)">
          {didit ? (
            <>
              <Field label="Status">{didit.status}</Field>
              <Field label="Referência">{didit.decision_ref ?? "—"}</Field>
            </>
          ) : (
            <p className="text-sm text-warm-500">Sem verificação Didit.</p>
          )}
        </Section>
      </div>

      <section className="space-y-3 rounded-xl border border-ink-500 bg-ink-700 p-5">
        <h2 className="font-display text-lg">Equipe</h2>
        {people.length === 0 ? (
          <p className="text-sm text-warm-500">Nenhuma pessoa vinculada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-warm-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">E-mail</th>
                  <th className="py-2 pr-4 font-medium">Papéis</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500">
                {people.map((p, i) => (
                  <tr key={i} className="text-warm-200">
                    <td className="py-2 pr-4">{p.full_name}</td>
                    <td className="py-2 pr-4 text-warm-400">{p.email}</td>
                    <td className="py-2 pr-4 text-warm-400">{p.roles.join(", ") || "—"}</td>
                    <td className="py-2 text-warm-400">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-ink-500 bg-ink-700 p-5">
        <h2 className="font-display text-lg">Documentos enviados</h2>
        <p className="text-xs text-warm-500">
          Referências apenas — os arquivos ficam na Didit (a Lince não os armazena). Encaminhe à
          Avenia manualmente.
        </p>
        {documents.length === 0 ? (
          <p className="text-sm text-warm-400">Nenhum documento enviado.</p>
        ) : (
          <ul className="divide-y divide-ink-500">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-warm-200">{d.filename}</span>
                <span className="text-xs text-warm-500">{d.content_type}</span>
                <span className="text-xs text-warm-500">{Math.round(d.size_bytes / 1024)} KB</span>
                <span className={cn("text-xs", d.status === "failed" ? "text-clay-500" : "text-emerald-500")}>
                  {d.status === "failed" ? "Falha" : "Recebido"}
                </span>
                <span className="font-mono text-xs text-warm-600" title={d.didit_ref ?? undefined}>
                  {d.didit_ref ? `${d.didit_ref.slice(0, 16)}…` : "—"}
                </span>
                <span className="text-xs text-warm-500">{formatDateTime(d.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-ink-500 bg-ink-700 p-5">
        <h2 className="font-display text-lg">Histórico</h2>
        <StatusHistory audit={audit} />
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
