"use client";

export default function BrowserFrame({
  children,
  style,
  dark = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  dark?: boolean;
}) {
  const dotColor = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";

  return (
    <div
      style={{
        borderRadius: 16,
        border: dark
          ? "0.5px solid rgba(255,255,255,0.1)"
          : "0.5px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: dark ? "#141414" : "var(--background)",
        boxShadow: dark
          ? "0 24px 48px rgba(0,0,0,0.4)"
          : "0 24px 48px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 28,
          background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderBottom: dark
            ? "0.5px solid rgba(255,255,255,0.06)"
            : "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
      </div>
      {/* Content */}
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}
