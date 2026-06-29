"use server";

import { currentUser } from "@clerk/nextjs/server";
import { approveOrg } from "@/lib/admin-api";

/**
 * Record Avenia's verdict (approve) for an org. Modelo A: this records Avenia's
 * decision, not a Lince adjudication — the backend audit-logs it as a relay.
 * The staff identity comes from the admin Clerk instance.
 */
export async function approveOrgAction(orgId: string): Promise<{ ok: true } | { error: string }> {
  const user = await currentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const res = await approveOrg(orgId, {
    adminClerkUserId: user.id,
    adminEmail: user.primaryEmailAddress?.emailAddress ?? "",
    adminName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Admin",
  });
  if (!res.ok) return { error: res.error };
  return { ok: true };
}
