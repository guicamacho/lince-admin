/**
 * Admin feature flags (build-time constants — flip and redeploy).
 *
 * MAKER_CHECKER_ENABLED: the two-operator approvals queue (A4). Hidden while there is a
 * single ops user, because requester ≠ approver is enforced server-side — one admin can
 * never approve their own request, so the queue and the "2ª aprovação" option are dead UI.
 * The backend + /approvals route stay in place and tested; flip this to true once a second
 * staff account exists.
 */
export const MAKER_CHECKER_ENABLED = false;
