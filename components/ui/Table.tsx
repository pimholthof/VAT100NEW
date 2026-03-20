import React from "react";

export function Th({
  children,
  className,
  scope = "col",
}: {
  children?: React.ReactNode;
  className?: string;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
}) {
  return (
    <th
      scope={scope}
      className={`label py-4 px-0 text-left opacity-50 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-4 px-0 font-light ${className ?? ""}`}>
      {children}
    </td>
  );
}
