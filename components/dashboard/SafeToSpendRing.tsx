"use client";

import { motion } from "framer-motion";

interface SafeToSpendRingProps {
  percentage: number; // 0 to 1 (e.g., 0.65 for 65%)
  size?: number;
  strokeWidth?: number;
}

export function SafeToSpendRing({ 
  percentage = 0, 
  size = 200, 
  strokeWidth = 12 
}: SafeToSpendRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - percentage * circumference;

  return (
    <div 
      className="liquid-glimmer glass-refraction"
      style={{ 
        width: size, 
        height: size, 
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%"
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "absolute",
          width: "80%",
          height: "80%",
          background: "var(--color-accent)",
          filter: "blur(60px)",
          opacity: 0.1,
          borderRadius: "50%"
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(0, 0, 0, 0.03)"
          strokeWidth={strokeWidth}
        />
        
        {/* Animated Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ 
            duration: 2, 
            ease: [0.16, 1, 0.3, 1], // Liquid ease-out
            delay: 0.5 
          }}
          strokeLinecap="square"
        />
      </svg>

      {/* Center content slot */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: "rotate(0deg)"
        }}
      >
        <span className="label" style={{ marginBottom: 4 }}>Safe to Spend</span>
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "var(--text-mono-md)",
            fontWeight: 400,
            letterSpacing: "-0.05em",
            color: "var(--foreground)"
          }}
        >
          {Math.round(percentage * 100)}%
        </motion.span>
      </div>
    </div>
  );
}
