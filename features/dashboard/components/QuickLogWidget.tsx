"use client";

import { useState, useTransition } from "react";
import { createHoursEntry } from "@/features/hours/actions";
import { createTrip } from "@/features/trips/actions";

export function QuickLogWidget() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function handleQuickHours(hours: number) {
    startTransition(async () => {
      setMessage(null);
      const result = await createHoursEntry({
        date: today,
        hours,
        category: "Werk",
      });
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(`${hours} uur geregistreerd`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  }

  function handleQuickTrip(km: number) {
    startTransition(async () => {
      setMessage(null);
      const result = await createTrip({
        date: today,
        distance_km: km,
        is_return_trip: false,
        purpose: "Zakelijke rit",
      });
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(`${km} km geregistreerd`);
        setTimeout(() => setMessage(null), 3000);
      }
    });
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: 16,
    }}>
      <div style={{
        padding: 24,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        <span className="label" style={{ margin: 0, fontSize: 10 }}>Uren vandaag</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[4, 8, 10].map((h) => (
            <button
              key={h}
              className="btn-secondary"
              style={{ flex: 1, padding: "10px 12px", fontSize: 12 }}
              onClick={() => handleQuickHours(h)}
              disabled={isPending}
            >
              +{h} uur
            </button>
          ))}
        </div>
      </div>
      <div style={{
        padding: 24,
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        <span className="label" style={{ margin: 0, fontSize: 10 }}>Kilometers</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[25, 50, 100].map((km) => (
            <button
              key={km}
              className="btn-secondary"
              style={{ flex: 1, padding: "10px 12px", fontSize: 12 }}
              onClick={() => handleQuickTrip(km)}
              disabled={isPending}
            >
              +{km} km
            </button>
          ))}
        </div>
      </div>
      {message && (
        <p style={{
          gridColumn: "1 / -1",
          margin: 0,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-success)",
          opacity: 0.8,
        }}>{message}</p>
      )}
    </div>
  );
}
