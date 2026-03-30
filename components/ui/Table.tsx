import React from "react";

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
        padding: "14px 12px 14px 0",
        textAlign: "left",
        opacity: 0.3,
        fontWeight: 600,
        whiteSpace: "nowrap",
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
        padding: "14px 12px 14px 0",
        fontWeight: 400,
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
