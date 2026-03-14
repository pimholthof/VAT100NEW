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
      className="font-medium text-[11px] tracking-[0.02em] py-3 px-2"
      style={style}
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
      className="py-3 px-2 font-light"
      style={style}
    >
      {children}
    </td>
  );
}
