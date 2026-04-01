import { createServiceClient } from "@/lib/supabase/service";
import { NudgeLeadButton, BillingAlertButton } from "./RetentionButtons";

export async function getRetentionData() {
  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Leads at risk (chosen plan but no account yet, > 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  const { data: atRiskLeads } = await supabase
    .from("leads")
    .select("*, plans!target_plan_id(name)")
    .not("target_plan_id", "is", null)
    .is("vat100_user_id", null)
    .lt("updated_at", oneDayAgo.toISOString())
    .limit(5);

  // 2. Churn risks (past_due subscriptions)
  const { data: pastDueSubs } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(name), profile:profiles(full_name, studio_name)")
    .eq("status", "past_due")
    .limit(5);

  // 3. Inactive users (> 30 days no profile update/activity)
  const { data: inactiveUsers } = await supabase
    .from("profiles")
    .select("*")
    .lt("updated_at", thirtyDaysAgo.toISOString())
    .limit(5);

  return { atRiskLeads, pastDueSubs, inactiveUsers };
}

export default async function RetentionDashboard() {
  const { atRiskLeads, pastDueSubs, inactiveUsers } = await getRetentionData();

  return (
    <div className="space-y-12 mt-16">
      <div className="flex items-center gap-4 border-b-4 border-black pb-4">
        <h2 className="text-4xl font-black italic tracking-tighter">RETENTION RADAR</h2>
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">At Risk</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* At Risk Leads */}
        <div className="space-y-4">
          <div className="label-strong flex justify-between">
            <span>Stagnant Leads</span>
            <span className="opacity-40">{atRiskLeads?.length || 0}</span>
          </div>
          <div className="space-y-2">
            {atRiskLeads?.map((lead) => (
              <div key={lead.id} className="border-2 border-black p-3 bg-white">
                <div className="text-[10px] font-bold opacity-40 uppercase mb-1">{lead.plans?.name}</div>
                <div className="font-bold text-sm truncate">{lead.email}</div>
                <div className="text-[10px] italic mt-1">Geen betaling na 24u</div>
                <NudgeLeadButton leadId={lead.id} />
              </div>
            ))}
            {atRiskLeads?.length === 0 && <p className="text-xs italic opacity-40">Geen stagnatie gedetecteerd.</p>}
          </div>
        </div>

        {/* Failed Payments */}
        <div className="space-y-4">
          <div className="label-strong flex justify-between">
            <span>Payment Failures</span>
            <span className="opacity-40 text-red-600">{pastDueSubs?.length || 0}</span>
          </div>
          <div className="space-y-2">
            {pastDueSubs?.map((sub) => (
              <div key={sub.id} className="border-2 border-red-600 p-3 bg-red-50">
                <div className="text-[10px] font-bold text-red-600 uppercase mb-1">{sub.plan?.name}</div>
                <div className="font-bold text-sm">{sub.profile?.studio_name || sub.profile?.full_name}</div>
                <div className="text-[10px] font-black text-red-600 mt-1 uppercase tracking-tighter">PAST DUE</div>
                <BillingAlertButton userId={sub.user_id} />
              </div>
            ))}
            {pastDueSubs?.length === 0 && <p className="text-xs italic opacity-40 text-green-600">Alle incasso's geslaagd.</p>}
          </div>
        </div>

        {/* Inactive Users */}
        <div className="space-y-4">
          <div className="label-strong flex justify-between">
            <span>Inactive Profiles</span>
            <span className="opacity-40">{inactiveUsers?.length || 0}</span>
          </div>
          <div className="space-y-2">
            {inactiveUsers?.map((user) => (
              <div key={user.id} className="border-2 border-black p-3 bg-white opacity-60">
                <div className="text-[10px] font-bold opacity-40 uppercase mb-1">Geen activiteit &gt; 30d</div>
                <div className="font-bold text-sm">{user.studio_name || user.full_name}</div>
              </div>
            ))}
            {inactiveUsers?.length === 0 && <p className="text-xs italic opacity-40">Iedereen is actief.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
