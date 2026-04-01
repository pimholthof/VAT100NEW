"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetupPage() {
  const [status, setStatus] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  async function makeMeAdmin() {
    setStatus("Bezig met autoriseren...");
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setStatus("Fout: Je bent niet ingelogd.");
      return;
    }

    // We try to update our own profile role. 
    // This depends on RLS, but in many dev environments this is allowed for own row.
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);

    if (error) {
      setStatus(`Fout: ${error.message}. Waarschijnlijk blokkeert de database (RLS) dit.`);
    } else {
      setStatus("Succes! Je bent nu Admin. Je wordt doorgestuurd...");
      setTimeout(() => router.push("/admin"), 1500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8 font-mono">
      <div className="border-8 border-black p-12 max-w-xl shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] text-center">
        <h1 className="text-4xl font-black uppercase mb-8 leading-none italic">ADMIN ACTIVATIE</h1>
        <p className="text-sm opacity-40 mb-12 uppercase tracking-widest">
          Klik hieronder om je huidige account te promoveren tot CEO/ADMIN van de VAT100 Hub.
        </p>
        
        <button 
          onClick={makeMeAdmin}
          className="bg-black text-white px-8 py-4 font-black uppercase hover:bg-red-600 transition-colors w-full mb-6"
        >
          MAAK MIJ ADMIN
        </button>

        {status && (
          <div className="text-[10px] font-black uppercase bg-gray-100 p-4 border-2 border-black italic">
            {status}
          </div>
        )}

        <div className="mt-12 text-[9px] opacity-30">
          VAT100 // SYSTEM EMERGENCY ACCESS
        </div>
      </div>
    </div>
  );
}
