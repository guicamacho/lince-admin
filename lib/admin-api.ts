/**
 * BFF client for the lince-backend admin endpoints (service-token gated).
 * The admin app authenticates staff via its own Clerk instance; these calls are
 * server-to-server with the shared ADMIN_SERVICE_TOKEN. The backend trusts the token
 * because the admin app is network-isolated (see lince-phase1 adminAuth.ts).
 */
import "server-only";

const BASE = process.env.LINCE_API_URL ?? "http://localhost:3000";
const TOKEN = process.env.ADMIN_SERVICE_TOKEN ?? "";

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-admin-service-token": TOKEN,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export interface AdminOrg {
  id: string;
  cnpj: string;
  razao_social: string;
  state: string;
  admission_state: string | null;
  kyb_forwarded_at: string | null;
  created_at: string;
}

export async function listOrgs(): Promise<AdminOrg[]> {
  const res = await adminFetch("/admin/orgs");
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { orgs?: AdminOrg[] };
  return body.orgs ?? [];
}

/** Record Avenia's verdict (approve). Modelo A: this records Avenia's decision, not a Lince one. */
export async function approveOrg(
  id: string,
  admin: { adminClerkUserId: string; adminEmail: string; adminName: string; aveniaReference?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/orgs/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(admin),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
