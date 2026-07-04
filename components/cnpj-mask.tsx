"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatCnpj, maskCnpj } from "@/lib/format";

/**
 * CNPJ display masking + copy (ruling #6). The value is shown masked; the copy button puts
 * the full formatted CNPJ on the clipboard. A permissioned + audited full reveal is deferred.
 */
export function CnpjMask({ cnpj }: { cnpj: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCnpj(cnpj));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied — nothing to surface */
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm text-warm-300">{maskCnpj(cnpj)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar CNPJ"
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-warm-400 outline-none transition-colors hover:bg-ink-600 hover:text-warm-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
      </button>
    </span>
  );
}
