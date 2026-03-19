import React, { useId } from "react";

export function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const autoId = useId();
  const inputId = htmlFor || autoId;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={inputId}
        style={{
          display: "block",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-label)",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
          opacity: 0.4,
        }}
      >
        {label}
      </label>
      {React.Children.map(children, (child) => {
        if (React.isValidElement<{ id?: string }>(child) && !child.props.id) {
          return React.cloneElement(child, { id: inputId });
        }
        return child;
      })}
    </div>
  );
}
