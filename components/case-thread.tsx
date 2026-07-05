import { Eye } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { AdminCaseMessage } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/**
 * The case correspondence thread — a read-only timeline over case_messages (clone of the org
 * StatusHistory primitive). Staff see the FULL thread including internal notes; a
 * "Visível ao cliente" tag marks the messages that reached the customer inbox. author_id is a
 * bare admin/people UUID (no roster to resolve names), so it is not surfaced.
 */
const AUTHOR_LABEL: Record<AdminCaseMessage["author_type"], string> = {
  admin: "Equipe",
  customer: "Cliente",
  system: "Sistema",
};

export function CaseThread({ messages }: { messages: AdminCaseMessage[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-warm-500">Nenhuma mensagem neste caso.</p>;
  }
  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const isCustomer = m.author_type === "customer";
        return (
          <li key={m.id} className="relative border-l border-ink-500 pl-4">
            <span
              className={cn(
                "absolute -left-[5px] top-1.5 size-2.5 rounded-full",
                isCustomer ? "bg-sky-500/70" : "bg-gold-500/70",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium text-warm-100">
                {AUTHOR_LABEL[m.author_type]}
                {m.customer_visible && m.author_type === "admin" && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 align-middle text-[0.65rem] font-medium text-sky-500">
                    <Eye className="size-3" aria-hidden />
                    Visível ao cliente
                  </span>
                )}
              </span>
              <time className="text-xs text-warm-500">{formatDateTime(m.created_at)}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-warm-200">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
