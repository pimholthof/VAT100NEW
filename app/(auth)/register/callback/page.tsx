"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { checkLeadActivation } from "@/features/admin/actions";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leadId = searchParams.get("lead_id");
  
  const [status, setStatus] = useState<"verifying" | "provisioning" | "ready" | "error">("verifying");
  const [dots, setDots] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Polling dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Polling for activation
  useEffect(() => {
    if (!leadId) {
      setError("Geen lead ID gevonden in de URL.");
      setStatus("error");
      return;
    }

    let pollCount = 0;
    const maxPolls = 30; // 60 seconds total

    const poll = async () => {
      if (pollCount >= maxPolls) {
        setError("De activatie duurt wat langer dan normaal. Neem contact op als het niet lukt.");
        setStatus("error");
        return;
      }

      const result = await checkLeadActivation(leadId);
      
      if (result.error) {
        setError(result.error);
        setStatus("error");
        return;
      }

      if (result.data?.activated) {
        setStatus("ready");
        // Wait a bit to show the "Ready" state before redirecting
        setTimeout(() => {
          router.push(`/login?new_account=true&email=${encodeURIComponent(leadId)}`);
        }, 2000);
      } else {
        pollCount++;
        // If still "provisioning", we stay in this state
        if (pollCount > 2) setStatus("provisioning");
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [leadId, router]);

  const stages = {
    verifying: { title: "Betaling Checken", subtitle: "We wachten op het seintje van Mollie" },
    provisioning: { title: "Studio Inrichten", subtitle: "Papiertjes regelen, dashboard oppoetsen" },
    ready: { title: "Klaar voor de Start!", subtitle: "Je account is live. Veel succes, ondernemer." },
    error: { title: "Oeps!", subtitle: error || "Er ging iets mis met de activatie." }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      {/* Editorial Brutalist Frame */}
      <div className="max-w-xl w-full border-4 border-white p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-white text-black px-3 py-1 font-bold text-xs uppercase tracking-tighter">
          VAT100 // AUTO-PILOT
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold uppercase leading-none tracking-tighter italic">
              {stages[status].title}
              {status !== "ready" && status !== "error" && <span>{dots}</span>}
            </h1>
            
            <p className="text-xl md:text-2xl font-medium tracking-tight text-white/60">
              {stages[status].subtitle}
            </p>

            {status === "error" && (
              <button 
                onClick={() => window.location.reload()}
                className="btn-primary mt-8 inline-block"
              >
                Opnieuw Proberen
              </button>
            )}

            {status === "ready" && (
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Decorative elements */}
        <div className="absolute bottom-4 right-4 text-[10px] opacity-20 font-mono">
          REF_ID: {leadId?.slice(0, 8)}...
        </div>
      </div>

      <div className="mt-12 max-w-md opacity-40 text-sm italic">
        {`"De beste manier om te voorspellen hoe je belasting gaat zijn, is door het zelf te automatiseren."`}
      </div>
    </div>
  );
}
