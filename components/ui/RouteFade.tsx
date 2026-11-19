"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

/** Subtle route transition — soft fade + small rise, keyed by pathname. */
export function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
