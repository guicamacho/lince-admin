"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye } from "lucide-react";
import { formatCnpj } from "@/lib/format";
import { revealCnpjAction } from "@/lib/admin-actions";

/**
 * CNPJ display (AC14). The API serves the value MASKED; the "Revelar" button performs the
 * permissioned + AUDITED full reveal (a sensitive-read audit event on the backend). Copy is
 * enabled only after a reveal — there is no unaudited path to the full identifier.
 */
export function CnpjMask({ cnpj, orgId }: { cnpj: string; orgId: string }) {
  const [full, setFull] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reveal() {
    setError(null);
    startTransition(async () => {
      const res = await revealCnpjAction(orgId);
      if ("error" in res) setError(res.error);
      else setFull(res.cnpj);
    });
  }

  async function copy() {
    if (!full) return;
    try {
      await navigator.clipboard.writeText(formatCnpj(full));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied — nothing to surface */
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm text-warm-300">{full ? formatCnpj(full) : cnpj}</span>
      {full ? (
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar CNPJ"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-warm-400 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={pending}
          aria-label="Revelar CNPJ completo (auditado)"
          title="Revelar (auditado)"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-warm-400 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Eye className="size-4" />
        </button>
      )}
      {error && <span className="text-xs text-clay-500">{error}</span>}
    </span>
  );
}
