import React from "react";

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "1px solid rgba(0, 0, 0, 0.10)",
  borderRadius: "8px",
  background: "rgba(0, 0, 0, 0.015)",
  color: "var(--foreground)",
  fontFamily: '"Helvetica Neue LT Std", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontSize: "14px",
  fontWeight: 400,
  outline: "none",
  transition: "border-color 0.2s ease, background 0.2s ease",
};

export const inputStyle: React.CSSProperties = { ...baseInputStyle };

export const selectStyle: React.CSSProperties = {
  ...baseInputStyle,
  cursor: "pointer",
};

export const textareaStyle: React.CSSProperties = {
  ...baseInputStyle,
  padding: 14,
  resize: "vertical",
  minHeight: 100,
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
