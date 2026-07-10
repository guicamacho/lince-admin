"use server";

import { currentUser } from "@clerk/nextjs/server";
import {
  recordVerdict,
  raiseRfi,
  setOrgAccess,
  postExportAudit,
  enqueueApproval,
  decideApproval,
  createCase,
  postCaseMessage,
  updateCaseStatus,
  assignCase,
} from "@/lib/admin-api";

/**
 * Resolve the acting staff member from the admin Clerk instance. Every write action passes
 * this identity to the backend (which maps it to admin_users). Returns an error string the
 * caller surfaces verbatim if the session is unusable.
 */
async function staffIdentity(): Promise<
  { adminClerkUserId: string; adminEmail: string; adminName: string } | { error: string }
> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return { error: "Conta de admin sem e-mail. Verifique o cadastro." };
  return {
    adminClerkUserId: user.id,
    adminEmail: email,
    adminName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Admin",
  };
}

/** Neutral pt-BR for the maker-checker error codes (never leak backend identifiers). */
function mapApprovalError(code: string): string {
  switch (code) {
    case "already_decided":
      return "Esta solicitação já foi decidida.";
    case "maker_checker_violation":
      return "O aprovador deve ser diferente de quem solicitou.";
    case "remark_required_on_decline":
      return "Informe o motivo da recusa.";
    default:
      return "Não foi possível concluir a ação.";
  }
}

/**
 * Record Avenia's verdict for an org. Modelo A: records Avenia's decision, not a Lince
 * adjudication (the backend audit-logs it as a relay). Reject requires a reason (remark).
 * Staff identity comes from the admin Clerk instance.
 */
export async function recordVerdictAction(
  orgId: string,
  input: { decision: "approved" | "rejected"; remark?: string; aveniaReference?: string },
): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return { error: "Conta de admin sem e-mail. Verifique o cadastro." };
  if (input.decision === "rejected" && !input.remark?.trim()) {
    return { error: "Informe o motivo da recusa." };
  }

  const res = await recordVerdict(orgId, {
    decision: input.decision,
    remark: input.remark?.trim() || undefined,
    aveniaReference: input.aveniaReference?.trim() || undefined,
    adminClerkUserId: user.id,
    adminEmail: email,
    adminName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Admin",
  });
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

/**
 * Relay an Avenia EDD info request to the customer (org -> rfi_required + a customer-visible
 * message shown on their onboarding screen). Modelo A: a relay, audit-logged by the backend.
 */
export async function raiseRfiAction(
  orgId: string,
  message: string,
): Promise<{ ok: true } | { error: string }> {
  const id = await staffIdentity();
  if ("error" in id) return id;
  if (!message.trim()) return { error: "Escreva a mensagem para o cliente." };
  const res = await raiseRfi(orgId, { message: message.trim(), ...id });
  if (!res.ok) {
    return {
      error: res.error.startsWith("illegal")
        ? "A empresa não está em um estado que permite solicitar informações."
        : "Não foi possível registrar a solicitação.",
    };
  }
  return { ok: true };
}

/**
 * Suspend, block or reinstate an org's access (orgs.access_status). Every action requires
 * a reason — the backend audit-logs the change with it. Staff identity comes from the
 * admin Clerk instance.
 */
export async function setOrgAccessAction(
  orgId: string,
  input: { action: "suspend" | "block" | "reinstate"; reason: string },
): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return { error: "Conta de admin sem e-mail. Verifique o cadastro." };
  if (!input.reason.trim()) return { error: "Informe o motivo." };

  const res = await setOrgAccess(orgId, {
    action: input.action,
    reason: input.reason.trim(),
    adminClerkUserId: user.id,
    adminEmail: email,
    adminName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Admin",
  });
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

/**
 * Record that an admin exported grid rows (A1). The CSV itself is built client-side from rows
 * the browser already holds; this only writes the audit trail (PRD-04 §3 "exports are audited").
 */
export async function exportAuditAction(input: {
  entity: string;
  filter: unknown;
  row_count: number;
}): Promise<{ ok: true } | { error: string }> {
  const id = await staffIdentity();
  if ("error" in id) return id;
  const res = await postExportAudit({ ...input, ...id });
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

/**
 * Enqueue an org block through maker-checker (A4, coexists with the direct block). The block
 * only takes effect once a SECOND operator approves it in the approvals queue.
 */
export async function enqueueBlockAction(
  orgId: string,
  reason: string,
): Promise<{ ok: true } | { error: string }> {
  const id = await staffIdentity();
  if ("error" in id) return id;
  if (!reason.trim()) return { error: "Informe o motivo." };
  const res = await enqueueApproval({
    action_type: "org_block",
    target_ref: orgId,
    payload: { reason: reason.trim() },
    ...id,
  });
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

/**
 * Decide an open approval (A4). A decline needs a reason. Backend enforces maker-checker and
 * CAS; error codes are mapped to neutral pt-BR. On approve, the executor runs server-side.
 */
export async function decideApprovalAction(
  id: string,
  input: { decision: "approved" | "declined"; remark?: string },
): Promise<{ ok: true } | { error: string }> {
  const who = await staffIdentity();
  if ("error" in who) return who;
  if (input.decision === "declined" && !input.remark?.trim()) {
    return { error: "Informe o motivo da recusa." };
  }
  const res = await decideApproval(id, {
    decision: input.decision,
    remark: input.remark?.trim() || undefined,
    ...who,
  });
  if (!res.ok) return { error: mapApprovalError(res.error) };
  return { ok: true };
}

/** Neutral pt-BR for the compliance-case error codes (frozen Wave 1 contract). */
function mapCaseError(code: string): string {
  switch (code) {
    case "invalid_case_type":
      return "Tipo de caso inválido.";
    case "invalid_priority":
      return "Prioridade inválida.";
    case "invalid_status":
      return "Status inválido.";
    case "empty_body":
      return "Escreva uma mensagem.";
    case "resolution_required_on_close":
      return "Informe a resolução para fechar o caso.";
    case "message_not_customer_visible_for_type":
      return "Este tipo de caso não permite mensagens visíveis ao cliente.";
    case "case_has_no_org":
      return "Vincule uma empresa antes de enviar ao cliente.";
    case "case_not_found":
      return "Caso não encontrado.";
    case "invalid_admin":
      return "Responsável inválido.";
    case "missing_admin_identity":
      return "Sessão expirada. Entre novamente.";
    default:
      return "Não foi possível concluir a ação.";
  }
}

/**
 * Open a compliance case (staff-initiated; reply-only model). Type is operational only — the
 * UI never offers an AML type and the backend rejects one (invalid_case_type). Staff identity
 * comes from the admin Clerk instance.
 */
export async function createCaseAction(input: {
  type: string;
  org_id?: string;
  priority?: string;
  summary?: string;
}): Promise<{ ok: true; id: string } | { error: string }> {
  const id = await staffIdentity();
  if ("error" in id) return id;
  if (!input.type.trim()) return { error: "Selecione o tipo do caso." };
  const res = await createCase({
    type: input.type,
    org_id: input.org_id || undefined,
    priority: input.priority || undefined,
    summary: input.summary?.trim() || undefined,
    ...id,
  });
  if (!res.ok) return { error: mapCaseError(res.error) };
  return { ok: true, id: res.id };
}

/**
 * Post a staff message on a case. customer_visible=false is an internal note (never leaves the
 * boundary); true is refused backend-side unless the case type is customer-facing. Staff
 * identity comes from the admin Clerk instance.
 */
export async function postCaseMessageAction(
  caseId: string,
  input: { body: string; customer_visible?: boolean },
): Promise<{ ok: true } | { error: string }> {
  const id = await staffIdentity();
  if ("error" in id) return id;
  if (!input.body.trim()) return { error: "Escreva uma mensagem." };
  const res = await postCaseMessage(caseId, {
    body: input.body.trim(),
    customer_visible: input.customer_visible === true,
    ...id,
  });
  if (!res.ok) return { error: mapCaseError(res.error) };
  return { ok: true };
}

/**
 * Change a case's status. Closing requires a resolution (backend enforces; re-checked here so
 * the user gets an inline error without a round-trip). No admin identity needed by the route.
 */
export async function updateCaseStatusAction(
  caseId: string,
  input: { status: string; resolution?: string },
): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  if (input.status === "closed" && !input.resolution?.trim()) {
    return { error: "Informe a resolução para fechar o caso." };
  }
  const res = await updateCaseStatus(caseId, {
    status: input.status,
    resolution: input.resolution?.trim() || undefined,
  });
  if (!res.ok) return { error: mapCaseError(res.error) };
  return { ok: true };
}

/**
 * Assign a case to an admin. ponytail: no admin-roster endpoint exists, so no UI feeds this
 * today — kept for the frozen contract; wire a picker once a roster read ships.
 */
export async function assignCaseAction(
  caseId: string,
  assignedAdminId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };
  const res = await assignCase(caseId, assignedAdminId);
  if (!res.ok) return { error: mapCaseError(res.error) };
  return { ok: true };
}
