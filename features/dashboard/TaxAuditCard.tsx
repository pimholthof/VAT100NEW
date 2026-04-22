"use client";

import { m as motion } from "framer-motion";
import Link from "next/link";

interface TaxAuditCardProps {
  score: number;
  findingsCount: number;
  status: string;
  quarter: number;
  year: number;
}

export function TaxAuditCard({ score, findingsCount, status, quarter, year }: TaxAuditCardProps) {
  const scoreColor = score > 90 ? "text-green-600" : score > 70 ? "text-yellow-600" : "text-red-600";
  const bgColor = score > 90 ? "bg-green-50" : score > 70 ? "bg-yellow-50" : "bg-red-50";

  return (
    <Link href="/admin/audit" className="block">
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`border-4 border-black p-8 ${bgColor} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">FISCALE GEZONDHEID // Q{quarter} {year}</p>
            <h3 className="text-3xl font-black uppercase italic leading-none">TAX AUDITOR</h3>
          </div>
          <div className={`text-5xl font-black italic ${scoreColor}`}>
            {score}%
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${score > 70 ? 'bg-green-600' : 'bg-red-600'}`} />
            <span className="text-xs font-black uppercase tracking-widest">{status}</span>
          </div>
          
          <p className="text-sm font-bold opacity-60 leading-tight">
            {findingsCount > 0 
              ? `${findingsCount} aandachtspunten gevonden in je administratie. Klik voor details.`
              : "Je administratie is volledig fiscus-proof. Geen actie vereist."}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-black/10 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest">Bekijk Audit Log</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </motion.div>
    </Link>
  );
}
