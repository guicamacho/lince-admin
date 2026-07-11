/**
 * BFF client for the lince-backend admin endpoints (service-token gated).
 * The admin app authenticates staff via its own Clerk instance; these calls are
 * server-to-server with the shared ADMIN_SERVICE_TOKEN. The backend trusts the token
 * because the admin app is network-isolated (see lince-phase1 adminAuth.ts).
 */
import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";

const BASE = process.env.LINCE_API_URL ?? "http://localhost:3000";
const TOKEN = process.env.ADMIN_SERVICE_TOKEN ?? "";

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  // Forward the staff member's admin-Clerk session token so the backend can VERIFY the actor
  // (PRD-08 §5.1) instead of trusting a body field. Harmless when the backend runs legacy mode.
  const token = await auth()
    .then((a) => a.getToken())
    .catch(() => null);
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-admin-service-token": TOKEN,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (!res.ok) throw new Error(`backend /admin/orgs failed: HTTP ${res.status}`);
  const body = (await res.json()) as { orgs?: AdminOrg[] };
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

export interface RaiseRfiInput {
  message: string;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

/** Relay an Avenia EDD info request to the customer (org -> rfi_required + customer-visible msg). */
export async function raiseRfi(
  id: string,
  input: RaiseRfiInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/orgs/${id}/rfi`, { method: "POST", body: JSON.stringify(input) });
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
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend /admin/orgs/:id failed: HTTP ${res.status}`);
  return (await res.json()) as OrgDetail;
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
  if (!res.ok) throw new Error(`backend /admin/admissions/aging failed: HTTP ${res.status}`);
  return (await res.json()) as AdmissionAging;
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
  if (!res.ok) throw new Error(`backend /admin/approvals failed: HTTP ${res.status}`);
  const body = (await res.json()) as { approvals?: ApprovalRow[] };
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

// --- Compliance cases (Wave 1 backend §4) — service-token gated. Reads are cache()'d so the
//     layout (open-case badge) and the page share one fetch; the customer-visibility wall is
//     enforced backend-side (messages.service). ---
export interface AdminCase {
  id: string;
  org_id: string | null;
  type: string;
  status: string;
  priority: string;
  summary: string | null;
  assigned_admin_id: string | null;
  opened_by: string | null;
  opened_at: string;
  closed_at: string | null;
  org_name: string | null;
  last_message_at: string | null;
}

export const listCases = cache(async (): Promise<AdminCase[]> => {
  const res = await adminFetch("/admin/cases");
  if (!res.ok) throw new Error(`backend /admin/cases failed: HTTP ${res.status}`);
  const body = (await res.json()) as { cases?: AdminCase[] };
  return body.cases ?? [];
});

export interface AdminCaseMessage {
  id: string;
  case_id: string;
  author_type: "admin" | "customer" | "system";
  author_id: string | null;
  body: string;
  customer_visible: boolean;
  created_at: string;
}

export interface AdminCaseDetail {
  case: {
    id: string;
    org_id: string | null;
    type: string;
    status: string;
    priority: string;
    summary: string | null;
    resolution: string | null;
    assigned_admin_id: string | null;
    opened_by: string | null;
    opened_at: string;
    closed_at: string | null;
  };
  org: { id: string; razao_social: string; cnpj: string; state: string } | null;
  messages: AdminCaseMessage[];
}

export const getCaseDetail = cache(async (id: string): Promise<AdminCaseDetail | null> => {
  const res = await adminFetch(`/admin/cases/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend /admin/cases/:id failed: HTTP ${res.status}`);
  return (await res.json()) as AdminCaseDetail;
});

export interface CreateCaseInput {
  org_id?: string;
  type: string;
  priority?: string;
  summary?: string;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

export async function createCase(
  input: CreateCaseInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await adminFetch("/admin/cases", { method: "POST", body: JSON.stringify(input) });
  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !body.id) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  return { ok: true, id: body.id };
}

export interface PostCaseMessageInput {
  body: string;
  customer_visible?: boolean;
  adminClerkUserId: string;
  adminEmail: string;
  adminName: string;
}

export async function postCaseMessage(
  id: string,
  input: PostCaseMessageInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/cases/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function updateCaseStatus(
  id: string,
  input: { status: string; resolution?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/cases/${id}/status`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

/** Assign a case to an admin_users.id. ponytail: no roster endpoint exists yet, so no UI
 *  feeds this today — the binding is ready for when a `/admin/admins` roster ships. */
export async function assignCase(
  id: string,
  assignedAdminId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/cases/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_admin_id: assignedAdminId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

// --- Transações (PRD-04 §4.4): all-orgs Avenia-ticket view. Amounts in MINOR units. ---
export interface AdminTransaction {
  id: string;
  orgId: string;
  razaoSocial: string;
  type: "deposit" | "convert_and_send" | "payout";
  state: string;
  ticketStatus: string;
  sourceCurrency: string | null;
  sourceAmount: number | null;
  destCurrency: string | null;
  destAmount: number | null;
  fees: Array<{ label: string; amount: number; currency: string; rebatable: boolean }>;
  vendorRef: string | null;
  createdAt: string;
}

export const listTransactions = cache(async (): Promise<AdminTransaction[]> => {
  const res = await adminFetch("/admin/transactions");
  if (!res.ok) throw new Error(`backend /admin/transactions failed: HTTP ${res.status}`);
  const body = (await res.json()) as { transactions?: AdminTransaction[] };
  return body.transactions ?? [];
});

// --- Eventos (PRD-04 §4.8): webhook processing health + guarded replay. ---
export interface WebhookEventRow {
  id: string;
  provider_code: string;
  event_type: string;
  external_event_id: string;
  status: "received" | "processed" | "failed" | "dead" | "ignored";
  attempts: number;
  last_error: string | null;
  received_at: string;
  processed_at: string | null;
}

export const listWebhookEvents = cache(async (): Promise<WebhookEventRow[]> => {
  const res = await adminFetch("/admin/webhooks");
  if (!res.ok) throw new Error(`backend /admin/webhooks failed: HTTP ${res.status}`);
  const body = (await res.json()) as { events?: WebhookEventRow[] };
  return body.events ?? [];
});

export async function replayWebhook(
  id: string,
  identity: { adminClerkUserId: string; adminEmail: string; adminName: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/webhooks/${id}/replay`, {
    method: "POST",
    body: JSON.stringify(identity),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

// --- Uploaded document references for an org (ops visibility; NO bytes — files live on Didit). ---
export interface OrgDocumentRow {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: "received" | "forwarded" | "failed";
  didit_ref: string | null;
  created_at: string;
  case_id: string | null;
}

export const listOrgDocuments = cache(async (orgId: string): Promise<OrgDocumentRow[]> => {
  const res = await adminFetch(`/admin/orgs/${orgId}/documents`);
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { documents?: OrgDocumentRow[] };
  return body.documents ?? [];
});

// --- Staff (admin_users) roster + role management (superadmin-gated on the backend). ---
export interface AdminStaff {
  id: string;
  email: string;
  name: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

export const listAdminStaff = cache(async (): Promise<{ ok: boolean; staff: AdminStaff[] }> => {
  const res = await adminFetch("/admin/admins");
  if (!res.ok) return { ok: false, staff: [] }; // 403 for non-superadmins
  const body = (await res.json().catch(() => ({}))) as { admins?: AdminStaff[] };
  return { ok: true, staff: body.admins ?? [] };
});

export async function setStaffRoles(
  adminId: string,
  roles: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await adminFetch(`/admin/admins/${adminId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roles }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
