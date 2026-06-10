import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { isGrowthEnabled } from "@/lib/config/features";
import Link from "next/link";

async function getPublicProfiles() {
  const supabase = createServiceClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, studio_name, avatar_url, bio, expertise, industry")
    .eq("is_public", true)
    .order("full_name");

  return profiles || [];
}

export default async function NetworkPage() {
  if (!isGrowthEnabled()) redirect("/dashboard");

  const profiles = await getPublicProfiles();

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "var(--space-xl)" }}>
        <div>
          <h1 className="display-title">Netwerk</h1>
          <p
            style={{
              fontSize: "var(--text-body-md)",
              fontWeight: 400,
              margin: "12px 0 0",
              opacity: 0.4,
              maxWidth: 560,
            }}
          >
            Het netwerk van gelijkgestemde creatieve ondernemers. Zoek, verbind
            en groei samen.
          </p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div
          className="glass"
          style={{
            padding: 48,
            borderRadius: "var(--radius)",
            textAlign: "center",
            opacity: 0.5,
            fontSize: 14,
          }}
        >
          Geen publieke profielen gevonden. Wees de eerste en zet je profiel op
          publiek in de instellingen.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="glass"
              style={{
                padding: 32,
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Profielkop */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3 className="section-header" style={{ marginBottom: 6 }}>
                    {profile.full_name}
                  </h3>
                  <p className="label" style={{ margin: 0 }}>
                    {profile.studio_name || "Zelfstandig ondernemer"}
                  </p>
                </div>
                <div
                  aria-hidden
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "var(--border-light)",
                    background: "rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {profile.full_name.charAt(0)}
                </div>
              </div>

              {/* Bio */}
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  opacity: 0.7,
                  margin: "0 0 24px",
                  flexGrow: 1,
                }}
              >
                {profile.bio || "Deze ondernemer laat het werk voor zich spreken."}
              </p>

              {/* Expertise */}
              {profile.expertise && profile.expertise.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  {profile.expertise.map((tag: string) => (
                    <span
                      key={tag}
                      className="label"
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "var(--border-light)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Sector */}
              <div
                style={{
                  borderTop: "var(--border-light)",
                  paddingTop: 16,
                }}
              >
                <span className="label">
                  {profile.industry || "Creatieve sector"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profiel-CTA */}
      <div
        style={{
          marginTop: "var(--space-xl)",
          borderTop: "var(--border-light)",
          paddingTop: 32,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>
          Staat jouw profiel nog op privé? Ga naar instellingen om zichtbaar te
          worden.
        </p>
        <Link href="/dashboard/settings" className="btn-secondary">
          Profiel beheren
        </Link>
      </div>
    </div>
  );
}
