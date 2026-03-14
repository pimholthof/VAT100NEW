import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { count: draftCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("status", "draft");

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 8px",
        }}
      >
        Dashboard
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
          margin: "0 0 40px",
        }}
      >
        Welkom, {user?.user_metadata?.full_name || user?.email}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        <DashboardCard label="Facturen" value={invoiceCount ?? 0} href="/dashboard/invoices" />
        <DashboardCard label="Concepten" value={draftCount ?? 0} href="/dashboard/invoices" />
        <DashboardCard label="Klanten" value={clientCount ?? 0} />
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div
      style={{
        border: "1px solid var(--foreground)",
        padding: 24,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-xs)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          margin: "0 0 8px",
          opacity: 0.6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </Link>
    );
  }
  return content;
}
