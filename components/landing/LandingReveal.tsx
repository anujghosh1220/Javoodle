"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function LandingReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex w-full max-w-[1500px] flex-1 flex-col items-center justify-center gap-10 text-center"
    >
      {children}
    </motion.div>
  );
}
