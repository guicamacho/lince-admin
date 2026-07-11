import { Suspense } from "react";
import { listWebhookEvents } from "@/lib/admin-api";
import { WebhookEventsTable } from "@/components/webhook-events-table";

// Eventos (PRD-04 §4.8) — webhook processing health + guarded replay of failed/dead events.
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
  const events = await listWebhookEvents();
  return <WebhookEventsTable events={events} />;
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
