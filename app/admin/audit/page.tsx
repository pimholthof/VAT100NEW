"use client";

import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { getControllerAuditHistory } from "@/features/dashboard/actions";
import Link from "next/link";

interface TaxAudit {
  id: string;
  quarter: number;
  year: number;
  score: number;
  findings: {
    missing_receipts: any[];
    unlinked_invoices: any[];
    hours_gap: number;
    anomalies: any[];
  } | any;
  status: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const { data: auditResult, isLoading } = useQuery({
    queryKey: ["admin-tax-audits"],
    queryFn: () => getControllerAuditHistory(),
  });

  if (isLoading) return <div className="p-12 animate-pulse text-sm font-black uppercase tracking-widest text-center">Controller analyseert historie...</div>;

  const audits = auditResult?.data as TaxAudit[] || [];

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto min-h-screen">
      <header className="mb-16">
        <Link href="/admin" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-8 inline-block">
          ← Terug naar Controller Hub
        </Link>
        <h1 className="display-hero text-6xl md:text-8xl leading-none italic mb-6">AUDIT LOG</h1>
        <p className="label-bold opacity-40 max-w-xl italic">
          CONTROLLER-ONLY // VERTROUWELIJK
        </p>
        <p className="text-sm mt-4 max-w-xl opacity-60">
          Dit overzicht toont alle automatische scans die zijn uitgevoerd op de administratie. Afwijkingen worden hier gerapporteerd voor directe actie door de CEO.
        </p>
      </header>

      <div className="space-y-12">
        {audits.length === 0 && (
          <div className="border-4 border-black p-12 text-center bg-gray-50">
            <p className="text-sm font-black uppercase tracking-widest opacity-40">Nog geen audit historie gevonden.</p>
          </div>
        )}

        {audits.map((audit) => (
          <motion.div 
            key={audit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-4 border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white"
          >
            {/* Audit Header */}
            <div className="bg-black text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">SCAN RESULTAAT // {formatDateLong(audit.created_at)}</p>
                <h2 className="text-3xl font-black uppercase italic">Q{audit.quarter} // {audit.year}</h2>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase opacity-50 mb-1">HEALTH SCORE</p>
                  <p className={`text-5xl font-black italic ${audit.score > 90 ? 'text-green-400' : 'text-yellow-400'}`}>{audit.score}%</p>
                </div>
                <div className={`px-4 py-2 border-2 border-current text-xs font-black uppercase tracking-widest ${audit.score > 90 ? 'text-green-400 border-green-400' : 'text-yellow-400 border-yellow-400'}`}>
                  {audit.status}
                </div>
              </div>
            </div>

            {/* Audit Findings */}
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-4 mb-6">Fiscale Bevindingen</h3>
                
                <div className="divide-y-2 divide-black/5">
                  {/* Missing Receipts */}
                  {audit.findings?.missing_receipts?.length > 0 ? (
                    audit.findings.missing_receipts.map((r: any, i: number) => (
                      <div key={i} className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="text-sm font-black uppercase mb-1">Missend bewijsstuk: {r.vendor_name || "Onbekend"}</p>
                          <p className="text-xs opacity-60 italic">Geen factuur/bon gevonden voor {formatCurrency(r.amount_inc_vat)} op {new Date(r.receipt_date).toLocaleDateString("nl-NL")}.</p>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-red-600 text-white px-3 py-1 italic">ACTIE VEREIST</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 italic text-xs opacity-40">Geen afwijkingen gevonden in bonnetjes.</div>
                  )}

                  {/* Hours Gap */}
                  {audit.findings?.hours_gap > 0 && (
                    <div className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <p className="text-sm font-black uppercase mb-1">Urencriterium (1.225u)</p>
                        <p className="text-xs opacity-60">Fiscale waarschuwing: circa {Math.round(audit.findings.hours_gap)} uur tekort op huidige kwartaalnorm.</p>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-yellow-500 text-black px-3 py-1 italic">MONITOR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
