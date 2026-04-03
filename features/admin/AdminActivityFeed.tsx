"use client";

import { useQuery } from "@tanstack/react-query";
import { getRecentActivityFeed } from "@/features/admin/actions/stats";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const EVENT_LABELS: Record<string, string> = {
  "lead.created": "Nieuwe lead",
  "lead.stage_change": "Lead fase gewijzigd",
  "lead.activated": "Lead geactiveerd",
  "invoice.created": "Factuur aangemaakt",
  "invoice.sent": "Factuur verstuurd",
  "invoice.paid": "Factuur betaald",
  "invoice.overdue": "Factuur achterstallig",
  "user.created": "Nieuw account",
  "user.onboarded": "Onboarding voltooid",
  "subscription.created": "Nieuw abonnement",
  "subscription.cancelled": "Abonnement opgezegd",
  "cron.agents": "Agents gedraaid",
  "cron.overdue": "Herinneringen verstuurd",
  "cron.recurring": "Terugkerende facturen verwerkt",
  "payment.received": "Betaling ontvangen",
  "receipt.uploaded": "Bon geüpload",
  "subscription.payment_failed": "Abonnementsbetaling mislukt",
  "subscription.reminder_sent": "Betaalherinnering verstuurd",
  "subscription.renewed": "Abonnement verlengd",
};

function getEventType(eventType: string): string {
  if (eventType.startsWith("lead")) return "lead";
  if (eventType.startsWith("invoice") || eventType.startsWith("payment")) return "invoice";
  if (eventType.startsWith("cron")) return "cron";
  if (eventType.startsWith("user") || eventType.startsWith("subscription")) return "user";
  return "payment";
}

function getEventDetail(eventType: string, payload: Record<string, unknown>): string | null {
  if (payload.email && typeof payload.email === "string") return payload.email;
  if (payload.name && typeof payload.name === "string") return payload.name;
  if (payload.amount && typeof payload.amount === "number") return `€${payload.amount.toFixed(2)}`;
  if (payload.invoice_number && typeof payload.invoice_number === "string") return payload.invoice_number;
  return null;
}

export function AdminActivityFeed() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: getRecentActivityFeed,
    refetchInterval: 30000,
  });

  const events = result?.data ?? [];

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <p className="label">Real-time</p>
          <h2 className="admin-panel-title">Platformactiviteit</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-empty-state">Laden...</div>
      ) : events.length === 0 ? (
        <div className="admin-empty-state">Nog geen events geregistreerd</div>
      ) : (
        <div className="admin-activity-feed">
          {events.map((event) => {
            const dotType = getEventType(event.event_type);
            const label = EVENT_LABELS[event.event_type] ?? event.event_type;
            const detail = getEventDetail(event.event_type, event.payload as Record<string, unknown>);
            const timeAgo = formatDistanceToNow(new Date(event.created_at), {
              addSuffix: true,
              locale: nl,
            });

            return (
              <div key={event.id} className="admin-activity-item">
                <span className="admin-activity-dot" data-type={dotType} />
                <div className="admin-activity-content">
                  <div className="admin-activity-label">{label}</div>
                  {detail && <div className="admin-activity-detail">{detail}</div>}
                </div>
                <span className="admin-activity-time">{timeAgo}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
