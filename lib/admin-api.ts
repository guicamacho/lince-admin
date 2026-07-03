/**
 * BFF client for the lince-backend admin endpoints (service-token gated).
 * The admin app authenticates staff via its own Clerk instance; these calls are
 * server-to-server with the shared ADMIN_SERVICE_TOKEN. The backend trusts the token
 * because the admin app is network-isolated (see lince-phase1 adminAuth.ts).
 */
import "server-only";
import { cache } from "react";

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
  access_status: string;
  kyb_forwarded_at: string | null;
  created_at: string;
}

// cache() dedupes the call within a single request (layout + page both read it).
export const listOrgs = cache(async (): Promise<AdminOrg[]> => {
  const res = await adminFetch("/admin/orgs");
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { orgs?: AdminOrg[] };
  return body.orgs ?? [];
});

export interface VerdictInput {
  decision: "approved" | "rejected";
  remark?: string;
  aveniaReference?: string;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

/** Record Avenia's verdict (approve/reject). Modelo A: records Avenia's decision, not a Lince one. */
export async function recordVerdict(
  id: string,
  input: VerdictInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/orgs/${id}/verdict`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export interface AccessInput {
  action: "suspend" | "block" | "reinstate";
  reason: string;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

/** Suspend, block or reinstate an org's access (orgs.access_status). Reason is audit-logged. */
export async function setOrgAccess(
  id: string,
  input: AccessInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/orgs/${id}/access`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
