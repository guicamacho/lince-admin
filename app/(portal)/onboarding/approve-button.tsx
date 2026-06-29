"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveOrgAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ApproveButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    setError(null);
    start(async () => {
      const res = await approveOrgAction(orgId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Registrando…" : "Registrar decisão da Avenia"}
      </Button>
      {error && <p className="text-xs text-clay-500">{error}</p>}
    </div>
  );
}
