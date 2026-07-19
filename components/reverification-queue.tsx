"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyPayeeAction } from "@/lib/admin-actions";
import { formatDateTime } from "@/lib/format";
import type { ReverificationRow } from "@/lib/admin-api";

// §13.2 operational approval queue: destination-changed payees, oldest first. Verifying
// makes the payee payable again and notifies the customer.
export function ReverificationQueue({ rows }: { rows: ReverificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) return null;

  function verify(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await verifyPayeeAction(id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section aria-labelledby="reverification-heading" className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-5">
      <h2 id="reverification-heading" className="font-display text-lg">Beneficiários aguardando reverificação</h2>
      <p className="mt-1 text-sm text-warm-400">
        Destino alterado pelo cliente — não pagáveis até a verificação operacional (PRD-03 §13.2).
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-clay-500">{error}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-500 text-xs uppercase tracking-wide text-warm-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Empresa</th>
              <th scope="col" className="px-3 py-2 font-medium">Beneficiário</th>
              <th scope="col" className="px-3 py-2 font-medium">Rail</th>
              <th scope="col" className="px-3 py-2 font-medium">Destino</th>
              <th scope="col" className="px-3 py-2 font-medium">Alterado em</th>
              <th scope="col" className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-warm-200">{r.razao_social}</td>
                <td className="px-3 py-2 text-warm-300">{r.label}</td>
                <td className="px-3 py-2 text-warm-300">{r.rail.toUpperCase()}{r.asset ? ` · ${r.asset}` : ""}</td>
                <td className="px-3 py-2 font-mono text-xs text-warm-400">{r.dest_hint ? `••${r.dest_hint}` : "—"}</td>
                <td className="px-3 py-2 text-warm-400">{formatDateTime(r.destination_changed_at)}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" className="cursor-pointer" disabled={pending} onClick={() => verify(r.id)}>
                    Verificar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
