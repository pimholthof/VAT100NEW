import { requireAdmin } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "🙂 Top",
  neutral: "😐 Oké",
  negative: "🙁 Kan beter",
};

interface FeedbackAuthor {
  studio_name: string | null;
  full_name: string | null;
}

interface FeedbackRow {
  id: string;
  message: string;
  sentiment: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
  author: FeedbackAuthor | FeedbackAuthor[] | null;
}

/**
 * Bèta-feedback inbox. Leest alle reacties (admin via RLS is_admin()).
 */
export default async function AdminFeedbackPage() {
  const admin = await requireAdmin();
  if (admin.error !== null) redirect("/dashboard");

  const { data } = await admin.supabase
    .from("feedback")
    .select(
      "id, message, sentiment, page_url, status, created_at, author:profiles(studio_name, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const feedback = (data ?? []) as unknown as FeedbackRow[];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Bèta-feedback
      </h1>
      <p className="label" style={{ opacity: 0.5, margin: "0 0 32px" }}>
        {feedback.length} reactie{feedback.length === 1 ? "" : "s"}
      </p>

      {feedback.length === 0 ? (
        <p style={{ opacity: 0.5 }}>Nog geen feedback ontvangen.</p>
      ) : (
        <div>
          {feedback.map((f) => {
            const author = Array.isArray(f.author) ? f.author[0] : f.author;
            const name = author?.studio_name || author?.full_name || "Onbekend";
            return (
              <div
                key={f.id}
                style={{ padding: "18px 0", borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <span className="label" style={{ opacity: 0.4, fontSize: 11 }}>
                    {new Date(f.created_at).toLocaleString("nl-NL")}
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>
                  {f.message}
                </p>
                <div style={{ display: "flex", gap: 12, fontSize: 11, opacity: 0.5 }}>
                  {f.sentiment && <span>{SENTIMENT_LABEL[f.sentiment] ?? f.sentiment}</span>}
                  {f.page_url && <span>{f.page_url}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
