import { Suspense } from "react";
import { listTransactions } from "@/lib/admin-api";
import { TransactionsTable } from "@/components/transactions-table";

// Transações (PRD-04 §4.4) — all-orgs Avenia-ticket view. Read-only; amounts in minor units.
export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Transações</h1>
        <p className="mt-1 text-sm text-warm-400">
          Movimentações de todas as empresas: depósitos, conversões e pagamentos, com o status do
          ticket na Avenia.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <TransactionsList />
      </Suspense>
    </div>
  );
}

async function TransactionsList() {
  const transactions = await listTransactions();
  return <TransactionsTable transactions={transactions} />;
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-11 animate-pulse rounded-lg border border-ink-500 bg-ink-700" />
      <div className="h-64 animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
    </div>
  );
}
