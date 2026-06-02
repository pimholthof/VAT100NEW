"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/features/feedback/actions";

interface InlineFeedbackProps {
  /** Context-label dat meegaat in de feedback, bijv. "BTW-overzicht". */
  context: string;
  question?: string;
}

const chip: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 10px",
  border: "0.5px solid rgba(0,0,0,0.15)",
  borderRadius: 999,
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};

/**
 * Wrijvingsloze in-context feedback bij een berekening: één tik "Ja/Nee", en
 * bij "Nee" een kort tekstveld. Leunt op de bestaande submitFeedback-actie en
 * tagt het bericht met de context zodat we precies weten waar het over gaat.
 */
export function InlineFeedback({ context, question = "Kloppen deze cijfers?" }: InlineFeedbackProps) {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "detail" | "done">("idle");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function send(sentiment: "positive" | "negative", detail?: string) {
    setPending(true);
    const msg = `[${context}] ${question} — ${sentiment === "positive" ? "Ja" : "Nee"}${
      detail ? `: ${detail}` : ""
    }`;
    await submitFeedback({ message: msg, sentiment, pageUrl: pathname });
    setPending(false);
    setState("done");
  }

  if (state === "done") {
    return <span style={{ fontSize: 11, opacity: 0.5 }}>Dank je — genoteerd.</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, opacity: 0.45 }}>{question}</span>
      {state === "idle" && (
        <>
          <button type="button" onClick={() => send("positive")} disabled={pending} style={chip}>
            Ja 👍
          </button>
          <button type="button" onClick={() => setState("detail")} disabled={pending} style={chip}>
            Nee 👎
          </button>
        </>
      )}
      {state === "detail" && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Wat klopt er niet?"
            maxLength={500}
            autoFocus
            style={{
              fontSize: 12,
              padding: "4px 8px",
              border: "0.5px solid rgba(0,0,0,0.15)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--foreground)",
              outline: "none",
              width: 200,
            }}
          />
          <button
            type="button"
            onClick={() => send("negative", text.trim() || undefined)}
            disabled={pending}
            style={chip}
          >
            Stuur
          </button>
        </span>
      )}
    </div>
  );
}
