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
    <div className="quick-log-widget">
      <div className="quick-log-section">
        <span className="label">Uren vandaag</span>
        <div className="quick-log-buttons">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickHours(4)}
            disabled={isPending}
          >
            +4 uur
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickHours(8)}
            disabled={isPending}
          >
            +8 uur
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickHours(10)}
            disabled={isPending}
          >
            +10 uur
          </button>
        </div>
      </div>
      <div className="quick-log-section">
        <span className="label">Kilometers</span>
        <div className="quick-log-buttons">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickTrip(25)}
            disabled={isPending}
          >
            +25 km
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickTrip(50)}
            disabled={isPending}
          >
            +50 km
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickTrip(100)}
            disabled={isPending}
          >
            +100 km
          </button>
        </div>
      </div>
      {message && (
        <p className="quick-log-message">{message}</p>
      )}
    </div>
  );
}
