import React from "react";

export function Th({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        fontFamily: "var(--font-body), sans-serif",
        fontSize: "var(--text-label)",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: 0.3,
        padding: "14px 0",
        textAlign: "left",
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
        padding: "14px 0",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
