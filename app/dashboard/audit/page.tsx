"use client";

import Link from "next/link";

export default function ForbiddenAuditPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="border-8 border-black p-12 max-w-2xl shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] text-center">
        <div className="text-red-600 text-6xl font-black italic mb-8 uppercase tracking-tighter">STOP // CONFIDENTIAL</div>
        <h1 className="text-4xl font-black uppercase mb-6 leading-none">DEZE LAAG IS ALLEEN VOOR DE CEO & CONTROLLER.</h1>
        <p className="label opacity-40 mb-12">
          De fiscale bewaking is een afgeschermde omgeving binnen de VAT100 Hub. Neem contact op met je admin voor toegang.
        </p>
        <Link href="/dashboard" className="display-hero text-2xl hover:italic transition-all inline-block border-b-4 border-black pb-2">
          ← TERUG NAAR OVERZICHT
        </Link>
      </div>
    </div>
  );
}
