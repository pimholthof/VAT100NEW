"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function QuickActionBar() {
  return (
    <motion.div
      initial={{ y: 100, x: "-50%" }}
      animate={{ y: 0, x: "-50%" }}
      style={{
        position: "fixed",
        bottom: 40,
        left: "50%",
        zIndex: 2000,
        padding: "12px 24px",
        borderRadius: 0,
        display: "flex",
        gap: 24,
        alignItems: "center"
      }}
      className="glass-dark"
    >
      <Link 
        href="/dashboard/invoices/new" 
        style={{ 
          color: "white", 
          textDecoration: "none", 
          fontSize: 13, 
          fontWeight: 500,
          letterSpacing: "-0.01em"
        }}
      >
        + Nieuwe Factuur
      </Link>
      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
      <Link 
        href="/dashboard/bank" 
        style={{ 
          color: "white", 
          textDecoration: "none", 
          fontSize: 13, 
          fontWeight: 500,
          letterSpacing: "-0.01em"
        }}
      >
        Bankkoppeling
      </Link>
      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-cmdk'))} 
        style={{ 
          background: "none", 
          border: "none", 
          color: "rgba(255,255,255,0.6)", 
          cursor: "pointer", 
          fontSize: 12,
          fontFamily: "var(--font-mono), monospace"
        }}
      >
        CMD+K
      </button>
    </motion.div>
  );
}
