"use client";

export default function BrowserFrame({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "0.5px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: "var(--background)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 32,
          background: "rgba(0,0,0,0.018)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.07)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.07)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.07)",
          }}
        />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            opacity: 0.15,
          }}
        >
          VAT100
        </span>
      </div>
      {/* Content */}
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}
