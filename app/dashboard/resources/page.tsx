import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { isGrowthEnabled } from "@/lib/config/features";
import Link from "next/link";

async function getResources() {
  const supabase = createServiceClient();
  const { data: resources } = await supabase
    .from("resources")
    .select("id, category, type, title, description, download_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return resources || [];
}

export default async function ResourcesPage() {
  if (!isGrowthEnabled()) redirect("/dashboard");

  const resources = await getResources();

  const categories = ["Fiscaal", "Business", "Growth", "Community"];

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">Kennisbank</h1>
          <p
            style={{
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
              margin: "12px 0 0",
              opacity: 0.4,
              maxWidth: 560,
            }}
          >
            Gidsen, templates en checklists. Alles wat je nodig hebt om je
            onderneming fiscaal scherp te houden.
          </p>
        </div>
      </div>

      {/* Categorieën */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
        {categories.map((category) => {
          const catResources = resources.filter((r) => r.category === category);
          if (catResources.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="section-header" style={{ marginBottom: 24 }}>
                {category}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 24,
                }}
              >
                {catResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="glass"
                    style={{
                      padding: 32,
                      borderRadius: "var(--radius)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <p className="label" style={{ margin: "0 0 16px" }}>
                      {resource.type}
                    </p>

                    <h3
                      className="section-header"
                      style={{ fontSize: "1.25rem", marginBottom: 12 }}
                    >
                      {resource.title}
                    </h3>

                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        opacity: 0.6,
                        margin: "0 0 24px",
                        flexGrow: 1,
                      }}
                    >
                      {resource.description}
                    </p>

                    <div
                      style={{
                        borderTop: "var(--border-light)",
                        paddingTop: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="label">VAT100</span>
                      <Link
                        href={resource.download_url || "#"}
                        className="btn-secondary"
                      >
                        Bekijken
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Suggestie */}
      <div
        style={{
          marginTop: "var(--space-xl)",
          borderTop: "var(--border-light)",
          paddingTop: 32,
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>
          Mis je een specifieke gids? We breiden de kennisbank continu uit.
        </p>
      </div>
    </div>
  );
}
