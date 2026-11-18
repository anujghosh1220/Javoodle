"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Entrance animation wrapper for page sections.
 * `delay` staggers siblings; children marked with <RevealItem> inherit
 * the parent's stagger timing.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      transition={{ delayChildren: delay }}
      className={cn("flex flex-col gap-6", className)}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered item — use inside <Reveal> or standalone with variants. */
export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}
