import React from "react";

interface FieldGroupProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
}

export function FieldGroup({
  label,
  htmlFor,
  error,
  hint,
  children,
}: FieldGroupProps) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const wrappedChildren = describedBy
    ? React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const childProps = child.props as Record<string, unknown>;
        return React.cloneElement(child, {
          "aria-describedby": [childProps["aria-describedby"], describedBy]
            .filter(Boolean)
            .join(" "),
          ...(error ? { "aria-invalid": true } : {}),
        } as React.HTMLAttributes<HTMLElement>);
      })
    : children;

  return (
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor={htmlFor}
        className="label"
        style={{
          display: "block",
          marginBottom: 8,
          opacity: 0.35,
          fontSize: 10,
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </label>
      {wrappedChildren}
      {hint && !error && (
        <p
          id={hintId}
          style={{
            margin: "6px 0 0",
            fontSize: 11,
            opacity: 0.45,
            lineHeight: 1.45,
          }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          style={{
            margin: "6px 0 0",
            fontSize: 11,
            color: "var(--color-accent)",
            lineHeight: 1.45,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
