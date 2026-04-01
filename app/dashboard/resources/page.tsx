import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";

async function getResources() {
  const supabase = createServiceClient();
  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  
  return resources || [];
}

export default async function ResourcesPage() {
  const resources = await getResources();
  
  const categories = ["Fiscaal", "Business", "Growth", "Community"];

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <header className="mb-20">
        <h1 className="display-hero text-6xl md:text-8xl leading-[0.85] mb-6 uppercase">Kennisbank</h1>
        <p className="label-bold opacity-40 max-w-xl">
          Exclusieve VAT100 gidsen, templates en checklists. Alles wat je nodig hebt om je business fiscaal vlijmscherp te maken.
        </p>
      </header>

      {/* Categories / Grid */}
      <div className="space-y-24">
        {categories.map((category) => {
          const catResources = resources.filter(r => r.category === category);
          if (catResources.length === 0) return null;

          return (
            <section key={category}>
              <div className="flex items-center gap-8 mb-12">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase">{category}</h2>
                <div className="h-1 bg-black flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {catResources.map((resource) => (
                  <div key={resource.id} className="border-4 border-black bg-white group hover:translate-y-[-4px] transition-all duration-300 flex flex-col">
                    <div className="p-8 flex-grow">
                      {/* Type Badge */}
                      <div className="mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-black text-white">
                          {resource.type}
                        </span>
                      </div>

                      <h3 className="text-2xl font-black italic tracking-tighter leading-tight mb-4 group-hover:underline transition-all">
                        {resource.title}
                      </h3>
                      
                      <p className="text-sm opacity-60 leading-relaxed">
                        {resource.description}
                      </p>
                    </div>

                    {/* Footer / CTA */}
                    <div className="border-t-4 border-black p-4 bg-black/5 flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                         VAT100 EXCLUSIVE
                      </div>
                      <Link 
                        href={resource.download_url || "#"} 
                        className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-all"
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

      {/* Resource Suggestion CTA */}
      <div className="mt-32 border-4 border-black border-dashed p-12 text-center bg-black/5">
        <h3 className="text-2xl font-black italic tracking-tighter mb-4">MIS JE EEN SPECIFIEKE GIDS?</h3>
        <p className="text-sm opacity-40 mb-8 max-w-md mx-auto">
          We breiden de kennisbank continu uit. Laat de community weten welke template of checklist jij nodig hebt.
        </p>
        <button className="label-strong underline hover:opacity-60 transition-opacity">
          Doe een suggestie
        </button>
      </div>
    </div>
  );
}
