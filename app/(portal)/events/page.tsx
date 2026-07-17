import { Suspense } from "react";
import { listFailedNotifications, listWebhookEvents } from "@/lib/admin-api";
import { WebhookEventsTable } from "@/components/webhook-events-table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Eventos (PRD-04 §4.8) — webhook processing health + guarded replay of failed/dead events,
// plus outbound notifications that failed to deliver (Cluster 1: undeliverable customer
// mail is an ops-actionable failure, same as a dead webhook).
export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Eventos</h1>
        <p className="mt-1 text-sm text-warm-400">
          Saúde do processamento de webhooks. Reprocesse eventos em falha ou descartados.
        </p>
      </div>
      <Suspense fallback={<EventsSkeleton />}>
        <EventsContent />
      </Suspense>
    </div>
  );
}

async function EventsContent() {
  const [events, failedNotifications] = await Promise.all([listWebhookEvents(), listFailedNotifications()]);
  return (
    <div className="space-y-6">
      <WebhookEventsTable events={events} />
      <FailedNotifications rows={failedNotifications} />
    </div>
  );
}

// Rendered only when actionable — an empty section would just push the events grid around.
function FailedNotifications({ rows }: { rows: Awaited<ReturnType<typeof listFailedNotifications>> }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="failed-notifications-heading">
      <h2 id="failed-notifications-heading" className="font-display text-lg">
        Notificações com falha
      </h2>
      <p className="mt-1 text-sm text-warm-400">
        E-mails e alertas que não puderam ser entregues. Falhas repetidas são descartadas e alertadas ao ops.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-ink-500">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-500 text-xs uppercase tracking-wide text-warm-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Evento</th>
              <th scope="col" className="px-4 py-3 font-medium">Modelo</th>
              <th scope="col" className="px-4 py-3 font-medium">Destinatário</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Tentativas</th>
              <th scope="col" className="px-4 py-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600">
            {rows.map((n) => (
              <tr key={n.id}>
                <td className="px-4 py-3 text-warm-200">{n.event_type}</td>
                <td className="px-4 py-3 font-mono text-xs text-warm-400">{n.template_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-warm-400">{n.recipient_ref}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs",
                      n.status === "dead"
                        ? "border-clay-500/50 bg-clay-500/20 font-semibold text-clay-500"
                        : "border-clay-500/30 bg-clay-500/10 text-clay-500",
                    )}
                  >
                    {n.status === "dead" ? "Descartada" : "Falhou"}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-warm-300">{n.attempts}</td>
                <td className="px-4 py-3 text-warm-400">{formatDateTime(n.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-h-[104px] animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-ink-500 bg-ink-700" />
    </div>
  );
}
