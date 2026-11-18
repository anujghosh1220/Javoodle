"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, type ReactNode } from "react";
import { fadeUp, stagger } from "@/lib/motion";

/**
 * Landing page entrance — the container fades in while each direct
 * child section rises with a gentle stagger.
 */
export function LandingReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-[1500px] flex-1 flex-col items-center justify-center gap-10 text-center"
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <motion.div variants={fadeUp} className="w-full">
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </motion.div>
  );
}
