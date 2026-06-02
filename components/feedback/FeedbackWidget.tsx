"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  submitFeedback,
  type FeedbackSentiment,
} from "@/features/feedback/actions";
import styles from "./FeedbackWidget.module.css";

const SENTIMENTS: { key: FeedbackSentiment; label: string; emoji: string }[] = [
  { key: "negative", label: "Kan beter", emoji: "🙁" },
  { key: "neutral", label: "Oké", emoji: "😐" },
  { key: "positive", label: "Top", emoji: "🙂" },
];

/**
 * Wrijvingsloze feedback: één zwevende knop op elke dashboardpagina. Open →
 * optioneel een gevoel + een tekstveld → versturen. Vangt automatisch de
 * huidige pagina mee zodat we weten waar de reactie over gaat.
 */
export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (message.trim().length < 2) {
      setError("Schrijf even kort wat je kwijt wilt.");
      return;
    }
    setPending(true);
    const res = await submitFeedback({ message, sentiment, pageUrl: pathname });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setMessage("");
    setSentiment(null);
    setTimeout(() => {
      setDone(false);
      setOpen(false);
    }, 1800);
  }

  return (
    <>
      <button
        className={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        type="button"
      >
        Feedback
      </button>

      {open && (
        <div className={`${styles.panel} glass`} role="dialog" aria-label="Feedback geven">
          {done ? (
            <p className={styles.done}>Dank je! We lezen alles. 🙏</p>
          ) : (
            <>
              <div className={styles.header}>
                <span className="label">Deel je feedback</span>
                <button
                  className={styles.close}
                  onClick={() => setOpen(false)}
                  aria-label="Sluiten"
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className={styles.sentiments}>
                {SENTIMENTS.map((s) => (
                  <button
                    key={s.key}
                    className={`${styles.sentiment} ${sentiment === s.key ? styles.sentimentActive : ""}`}
                    onClick={() => setSentiment(s.key)}
                    aria-pressed={sentiment === s.key}
                    title={s.label}
                    type="button"
                  >
                    <span aria-hidden="true">{s.emoji}</span>
                  </button>
                ))}
              </div>

              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Wat kan beter? Wat mis je? Wat werkt goed?"
                rows={4}
                maxLength={4000}
                autoFocus
              />

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              <button
                className={`btn-primary ${styles.submit}`}
                onClick={handleSubmit}
                disabled={pending}
                type="button"
              >
                {pending ? "Versturen…" : "Versturen"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
