"use server";

import { currentUser } from "@clerk/nextjs/server";
import { recordVerdict } from "@/lib/admin-api";

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
