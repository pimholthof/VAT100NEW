import React from "react";

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  border: "none",
  borderBottom: "0.6px solid var(--vat-dark-grey)",
  background: "transparent",
  color: "var(--foreground)",
  fontFamily: "var(--font-body), 'Cormorant Garamond', serif",
  fontSize: "16px",
  fontWeight: 400,
  outline: "none",
  transition: "border-color 0.2s ease",
};

export const inputStyle: React.CSSProperties = { ...baseInputStyle };

export const selectStyle: React.CSSProperties = {
  ...baseInputStyle,
  padding: "6px 0",
  cursor: "pointer",
};

export const textareaStyle: React.CSSProperties = {
  ...baseInputStyle,
  border: "0.6px solid var(--vat-dark-grey)",
  padding: 14,
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
