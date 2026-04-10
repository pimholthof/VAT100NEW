"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div>
      {faqs.map((faq, i) => (
        <div
          key={i}
          style={{
            borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{
              width: "100%",
              padding: "20px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              textAlign: "left",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--color-black)",
              fontFamily: "inherit",
            }}
          >
            {faq.q}
            <span
              style={{
                fontSize: 18,
                opacity: 0.3,
                transition: "transform 0.2s ease",
                transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                flexShrink: 0,
              }}
            >
              +
            </span>
          </button>
          <div
            style={{
              maxHeight: openFaq === i ? 200 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease",
            }}
          >
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                margin: 0,
                paddingBottom: 20,
                opacity: 0.55,
              }}
            >
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
