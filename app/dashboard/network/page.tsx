import { createServiceClient } from "@/lib/supabase/service";
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
  const profiles = await getPublicProfiles();

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <header className="mb-20">
        <h1 className="display-hero text-6xl md:text-8xl leading-[0.85] mb-6">NETWORK</h1>
        <p className="label-bold opacity-40 max-w-xl">
          Eén van de krachtigste assets van VAT100: Het netwerk van gelijkgestemde creative founders. Zoek, verbind en groei samen.
        </p>
      </header>

      {profiles.length === 0 ? (
        <div className="border-4 border-black p-12 bg-white text-center italic opacity-40">
          Geen publieke profielen gevonden. Wees de eerste en zet je profiel op publiek in de instellingen!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map((profile) => (
            <div key={profile.id} className="border-4 border-black bg-white p-8 group relative overflow-hidden flex flex-col">
              {/* Profile Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter leading-none mb-2">
                    {profile.full_name}
                  </h3>
                  <div className="label-strong opacity-40 text-[10px]">
                    {profile.studio_name || "Independent Founder"}
                  </div>
                </div>
                {/* Placeholder Avatar */}
                <div className="w-12 h-12 bg-black/5 border-2 border-black flex items-center justify-center font-black text-xl italic group-hover:bg-black group-hover:text-white transition-colors duration-500">
                  {profile.full_name.charAt(0)}
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm leading-relaxed mb-8 flex-grow opacity-80">
                {profile.bio || "Expertise spreekt voor zich. Geen bio nodig voor deze founder."}
              </p>

              {/* Expertise Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {profile.expertise?.map((tag: string) => (
                  <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-black text-white">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Industry */}
              <div className="border-t-2 border-black pt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                <div>{profile.industry || "Creative Sector"}</div>
                <div className="group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Community CTA */}
      <div className="mt-20 border-t-4 border-black pt-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-sm font-bold opacity-60">
          Staat jouw profiel nog op privé? Ga naar instellingen om zichtbaar te worden.
        </div>
        <Link 
          href="/dashboard/settings" 
          className="bg-black text-white px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black hover:border-black border-4 border-black transition-all"
        >
          Profiel Beheren
        </Link>
      </div>
    </div>
  );
}
