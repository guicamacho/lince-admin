/**
 * Customer-facing org status taxonomy for the back-office, derived from the backend
 * `orgs.state` (+ admission_state). Three buckets the user filters on:
 *  - active   : the account is live.
 *  - pending  : in KYB or awaiting Avenia's admission verdict (information pending).
 *  - inactive : Avenia rejected it (now); later also "us blocking" / "self-deactivated"
 *               once orgs.access_status (migration 0002) lands.
 * `awaitingDecision` flags the subset the admin actually relays a verdict for: the org
 * has been forwarded to Avenia and is waiting on the decision (vendor_pending).
 */
export type OrgStatusKey = "active" | "pending" | "inactive";

export interface OrgStatusInfo {
  key: OrgStatusKey;
  label: string;
  reason: string;
  awaitingDecision: boolean;
}

const INACTIVE_STATES = new Set(["rejected", "declined", "blocked", "suspended"]);

export function orgStatus(o: { state: string; admission_state: string | null }): OrgStatusInfo {
  if (o.state === "active") {
    return { key: "active", label: "Ativa", reason: "Conta ativa", awaitingDecision: false };
  }
  if (INACTIVE_STATES.has(o.state)) {
    const reason =
      o.state === "rejected"
        ? "Recusada pela Avenia"
        : o.state === "declined"
          ? "Recusada na verificação"
          : "Conta inativa";
    return { key: "inactive", label: "Inativa", reason, awaitingDecision: false };
  }
  // Everything else is in onboarding / admission flow → "information pending".
  const awaiting = o.state === "vendor_pending";
  return {
    key: "pending",
    label: "Informações pendentes",
    reason: awaiting ? "Aguardando decisão da Avenia" : "Em verificação (KYB)",
    awaitingDecision: awaiting,
  };
}

export const STATUS_BADGE: Record<OrgStatusKey, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  pending: "border-gold-500/30 bg-gold-500/10 text-gold-500",
  inactive: "border-clay-500/30 bg-clay-500/10 text-clay-500",
};
