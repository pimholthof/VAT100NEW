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
          height: 28,
          background: "rgba(0,0,0,0.02)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.08)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.08)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.08)",
          }}
        />
      </div>
      {/* Content */}
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}
