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

// --- Org 360 read (A2) — GET /admin/orgs/:id. References + status only (Modelo A). ---
export interface OrgDetailOrg {
  id: string;
  cnpj: string;
  razao_social: string;
  country_code: string | null;
  state: string;
  admission_state: string | null;
  access_status: string;
  access_reason: string | null;
  access_source: string | null;
  access_changed_at: string | null;
  kyb_forwarded_at: string | null;
  activated_at: string | null;
  created_at: string;
}

export interface AuditRow {
  event: string;
  actor_type: string;
  actor_id: string | null;
  payload: unknown;
  created_at: string;
}

export interface OrgDetail {
  org: OrgDetailOrg;
  admission: {
    authority_used: string | null;
    external_ref: string | null;
    recorded_by_name: string | null;
    recorded_at: string | null;
    submitted_at: string | null;
    elapsed_seconds: number | null;
  };
  avenia: {
    subaccount_id: string | null;
    kyb_l1_state: string | null;
    pofc_state: string | null;
    usd_state: string | null;
    eur_state: string | null;
  } | null;
  didit: { status: string; decision_ref: string | null } | null;
  people: Array<{ full_name: string; email: string; roles: string[]; status: string }>;
  audit: AuditRow[];
}

export const getOrgDetail = cache(async (id: string): Promise<OrgDetail | null> => {
  const res = await adminFetch(`/admin/orgs/${id}`);
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as OrgDetail | null;
});

// --- Admission aging + latency (A3) — GET /admin/admissions/aging. ---
export interface AgingRow {
  org_id: string;
  cnpj: string;
  razao_social: string;
  kyb_forwarded_at: string;
  elapsed_seconds: number;
  breached: boolean;
}

export interface AdmissionAging {
  threshold_days: number;
  pending_count: number;
  breach_count: number;
  pending: AgingRow[];
  latency: { p50_days: number | null; p90_days: number | null; p95_days: number | null; n: number };
}

export const getAdmissionAging = cache(async (): Promise<AdmissionAging | null> => {
  const res = await adminFetch("/admin/admissions/aging");
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as AdmissionAging | null;
});

// --- Export-audit sink (A1) — POST /admin/audit/export. The CSV is built client-side; this
//     records that an export happened. Admin identity is injected by the server action. ---
export interface ExportAuditInput {
  entity: string;
  filter: unknown;
  row_count: number;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

export async function postExportAudit(
  input: ExportAuditInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch("/admin/audit/export", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

// --- Maker-checker (A4) — POST/GET /admin/approvals + POST /admin/approvals/:id/decide. ---
export interface ApprovalRow {
  id: string;
  action_type: string;
  target_ref: string;
  payload: Record<string, unknown> | null;
  requested_at: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
}

export const listApprovals = cache(async (): Promise<ApprovalRow[]> => {
  const res = await adminFetch("/admin/approvals");
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { approvals?: ApprovalRow[] };
  return body.approvals ?? [];
});

export interface EnqueueApprovalInput {
  action_type: string;
  target_ref: string;
  payload?: Record<string, unknown>;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

export async function enqueueApproval(
  input: EnqueueApprovalInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch("/admin/approvals", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export interface DecideApprovalInput {
  decision: "approved" | "declined";
  remark?: string;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

/** Decide an open approval. Backend returns error codes already_decided (409) /
 *  maker_checker_violation (403) — mapped to neutral pt-BR by the server action. */
export async function decideApproval(
  id: string,
  input: DecideApprovalInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/approvals/${id}/decide`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
