"use server";

import { currentUser } from "@clerk/nextjs/server";
import {
  recordVerdict,
  setOrgAccess,
  postExportAudit,
  enqueueApproval,
  decideApproval,
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
