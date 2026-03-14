import React from "react";

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 2px",
  border: "none",
  borderBottom: "var(--border-input)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 300,
  outline: "none",
};

export const inputStyle: React.CSSProperties = { ...baseInputStyle };

export const selectStyle: React.CSSProperties = {
  ...baseInputStyle,
  padding: "4px 2px",
  cursor: "pointer",
};

export const textareaStyle: React.CSSProperties = {
  ...baseInputStyle,
  resize: "vertical",
};

export function Input({
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={{ ...inputStyle, ...style }} {...props} />;
}

export function Select({
  children,
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select style={{ ...selectStyle, ...style }} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea style={{ ...textareaStyle, ...style }} {...props} />;
}
