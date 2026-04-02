import React from "react";

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="table-wrapper">
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
