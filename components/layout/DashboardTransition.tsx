"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function DashboardTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.99, filter: "blur(2px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1] // Apple-style custom ease
      }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}
