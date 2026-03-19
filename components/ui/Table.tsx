import React from "react";

export function Th({
  children,
  style,
  scope = "col",
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
}) {
  return (
    <th
      scope={scope}
      className="label"
      style={{
        padding: "16px 0",
        textAlign: "left",
        opacity: 0.5,
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
