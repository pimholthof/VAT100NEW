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
        fontWeight: 500,
        fontSize: "var(--text-body-sm)",
        letterSpacing: "0.02em",
        padding: "12px 8px",
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
        padding: "12px 8px",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
