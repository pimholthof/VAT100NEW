"use client";

import Link from "next/link";

interface AdminStateAction {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

export function AdminStatePanel({
  eyebrow,
  title,
  description,
  actions = [],
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: AdminStateAction[];
}) {
  return (
    <section className="admin-state-panel">
      {eyebrow ? <p className="label">{eyebrow}</p> : null}
      <div className="admin-state-copy">
        <h1 className="admin-state-title">{title}</h1>
        <p className="admin-state-description">{description}</p>
      </div>
      {actions.length > 0 ? (
        <div className="admin-state-actions">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`admin-button-link${action.variant === "secondary" ? " admin-button-link-secondary" : ""}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
