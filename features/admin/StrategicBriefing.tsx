import { createServiceClient } from "@/lib/supabase/service";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export async function getLatestBriefing() {
  const supabase = createServiceClient();
  const { data: briefing } = await supabase
    .from("strategic_briefings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return briefing;
}

export default async function StrategicBriefing() {
  const briefing = await getLatestBriefing();

  if (!briefing) {
    return (
      <div className="border-4 border-black p-8 bg-white opacity-40 italic text-sm">
        Nog geen strategische scan uitgevoerd. Wacht op de wekelijkse briefing.
      </div>
    );
  }

  return (
    <div className="border-4 border-black p-8 bg-white relative overflow-hidden group">
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-black translate-x-16 -translate-y-16 rotate-45 group-hover:rotate-12 transition-transform duration-700 opacity-5"></div>
      
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-1 opacity-40">LATEST CFO SCAN</h2>
          <div className="text-[10px] font-bold opacity-20">
            {format(new Date(briefing.created_at), "d MMMM yyyy HH:mm", { locale: nl })}
          </div>
        </div>
        <div className="text-4xl font-black italic tracking-tighter opacity-10">CFO</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Monthly Revenue (MRR)</div>
          <div className="text-3xl font-black italic tracking-tighter">
            €{(briefing.mrr_cents / 100).toFixed(2)}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Revenue at Risk (Churn)</div>
          <div className="text-3xl font-black italic tracking-tighter text-red-600">
            €{(briefing.churn_mrr_cents / 100).toFixed(2)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Pipeline Value</div>
          <div className="text-3xl font-black italic tracking-tighter text-blue-600">
            €{(briefing.pipeline_value_cents / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t-2 border-black/10">
        <div className="label-strong mb-4">Strategic Insight</div>
        <p className="text-sm leading-relaxed max-w-2xl text-justify font-medium">
          {briefing.briefing_text}
        </p>
      </div>

      <div className="mt-8 flex gap-4">
         <span className="bg-black text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest">
           {briefing.active_users} Active Users
         </span>
         <span className={`text-[10px] font-black px-3 py-1 uppercase tracking-widest border-2 border-black ${briefing.at_risk_leads > 0 ? 'bg-red-500 text-white border-red-500' : 'opacity-20'}`}>
           {briefing.at_risk_leads} Risks Detected
         </span>
      </div>
    </div>
  );
}
