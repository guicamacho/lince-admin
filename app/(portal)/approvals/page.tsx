import { listApprovals } from "@/lib/admin-api";
import { ApprovalQueueCard } from "@/components/approval-queue-card";

// Maker-checker queue (A4). Open requests only; a SECOND operator decides each. Executing an
// approval runs its side effect server-side (Session 5 wires org_block; others 501 until their WP).
export default async function ApprovalsPage() {
  const approvals = await listApprovals();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Aprovações pendentes</h1>
        <p className="mt-1 text-sm text-warm-400">
          Ações que exigem uma 2ª aprovação (maker-checker). O aprovador deve ser diferente de
          quem solicitou.
        </p>
      </div>

      {approvals.length === 0 ? (
        <p className="text-sm text-warm-500">Nenhuma aprovação pendente.</p>
      ) : (
        <div className="max-w-2xl space-y-3">
          {approvals.map((a) => (
            <ApprovalQueueCard key={a.id} approval={a} />
          ))}
        </div>
      )}
    </div>
  );
}
