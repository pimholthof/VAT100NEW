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
      className="label"
      style={{
        padding: "16px 0",
        textAlign: "left",
        opacity: 0.3,
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
        padding: "16px 0",
        fontWeight: 300,
        ...style,
      }}
    >
      {children}
    </td>
  );
}
