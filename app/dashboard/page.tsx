import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "var(--text-display-md)",
            fontWeight: 900,
            letterSpacing: "var(--tracking-display)",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-lg)",
            fontWeight: 300,
            margin: "8px 0 40px",
          }}
        >
          {user?.user_metadata?.full_name || user?.email}
        </p>
        <form action={logout}>
          <button
            type="submit"
            style={{
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "var(--text-body-lg)",
              fontWeight: 500,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              padding: "14px 16px",
              border: "none",
              borderRadius: 0,
              background: "var(--color-black)",
              color: "var(--color-white)",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  );
}
