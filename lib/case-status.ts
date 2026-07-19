/**
 * Compliance-case taxonomy for the back-office, mirroring the backend CHECKs (migration 0001
 * cases + 0006 operational types). pt-BR labels + badge maps for the list/detail, and the
 * customer-facing allowlist that gates the "Enviar ao cliente" compose checkbox.
 *
 * Modelo A: AML/SMR types are structurally absent from the schema — they never appear here,
 * so the create-case type picker cannot offer one (the real wall is the backend allowlist).
 */
export type CaseStatusKey = "open" | "in_review" | "escalated" | "closed";
export type CasePriorityKey = "low" | "normal" | "high" | "urgent";

// Order = the create-case picker order. Operational types only (matches OPERATIONAL_CASE_TYPES
// in cases.service.ts); no AML type exists to list.
export const CASE_TYPES = [
  "kyb_completeness",
  "rfi_relay",
  "avenia_decision_relay",
  "beneficiary_review",
  "manual_review",
  "recon_break",
  "customer_dispute",
  "customer_inquiry",
  "dormant_review",
  "support",
] as const;

export const CASE_STATUSES: CaseStatusKey[] = ["open", "in_review", "escalated", "closed"];
export const CASE_PRIORITIES: CasePriorityKey[] = ["low", "normal", "high", "urgent"];

// UX gate only — the real customer-visibility wall is the backend (messages.service
// messageCanBeCustomerVisible). This just decides whether to SHOW the compose checkbox.
export const CUSTOMER_FACING_CASE_TYPES = new Set(["rfi_relay", "kyb_completeness", "customer_dispute"]);

const CASE_TYPE_LABEL: Record<string, string> = {
  kyb_completeness: "Complementação de cadastro (KYB)",
  rfi_relay: "Solicitação de informações (RFI)",
  avenia_decision_relay: "Decisão da Avenia",
  beneficiary_review: "Revisão de beneficiário",
  manual_review: "Revisão manual",
  recon_break: "Divergência de conciliação",
  customer_dispute: "Contestação do cliente",
  customer_inquiry: "Dúvida do cliente",
  dormant_review: "Revisão de conta inativa",
  support: "Suporte",
};

export const CASE_STATUS_LABEL: Record<CaseStatusKey, string> = {
  open: "Aberto",
  in_review: "Em análise",
  escalated: "Escalado",
  closed: "Fechado",
};

export const CASE_PRIORITY_LABEL: Record<CasePriorityKey, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const CASE_STATUS_BADGE: Record<CaseStatusKey, string> = {
  open: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  in_review: "border-gold-500/30 bg-gold-500/10 text-gold-500",
  escalated: "border-clay-500/30 bg-clay-500/10 text-clay-500",
  closed: "border-warm-600/30 bg-warm-600/10 text-warm-400",
};

export const CASE_PRIORITY_BADGE: Record<CasePriorityKey, string> = {
  low: "border-warm-600/30 bg-warm-600/10 text-warm-400",
  normal: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  high: "border-gold-500/30 bg-gold-500/10 text-gold-500",
  urgent: "border-clay-500/30 bg-clay-500/10 text-clay-500",
};

/** Label for a case type; falls back to the raw code for any unmapped value. */
export function caseTypeLabel(type: string): string {
  return CASE_TYPE_LABEL[type] ?? type;
}

export function caseStatusLabel(status: string): string {
  return CASE_STATUS_LABEL[status as CaseStatusKey] ?? status;
}

export function casePriorityLabel(priority: string): string {
  return CASE_PRIORITY_LABEL[priority as CasePriorityKey] ?? priority;
}
