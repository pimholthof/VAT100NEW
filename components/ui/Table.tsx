import React from "react";

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      border: "0.5px solid rgba(0, 0, 0, 0.06)",
      borderRadius: "var(--radius)",
    }}>
      {children}
    </div>
  );
}

export function Th({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      className="label"
      style={{
        padding: "12px 16px 12px 0",
        textAlign: "left",
        opacity: 0.3,
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontSize: 10,
        letterSpacing: "0.1em",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "14px 16px 14px 0",
        fontWeight: 400,
        fontSize: 13,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
