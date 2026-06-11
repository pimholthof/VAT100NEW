import React from "react";

export function TableWrapper({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="table-wrapper" style={style}>
      {children}
    </div>
  );
}

export function Th({
  children,
  className,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <th className={`label table-th ${className ?? ""}`} style={style}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={`table-td ${className ?? ""}`} style={style}>
      {children}
    </td>
  );
}
