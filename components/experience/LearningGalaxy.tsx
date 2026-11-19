"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface GalaxyUnit {
  id: string;
  phase: number;
  name: string;
  lessons: number;
  completed: number;
}

/**
 * Learning Galaxy — syllabus units as navigable "planets" with real
 * lesson-completion fractions. Conventional links preserved (accessible).
 */
export function LearningGalaxy({ units }: { units: GalaxyUnit[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {units.map((u, i) => {
        const pct = u.lessons ? Math.round((u.completed / u.lessons) * 100) : 0;
        const done = u.completed >= u.lessons && u.lessons > 0;
        return (
          <motion.div key={u.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href="/learn" className="block">
              <Card interactive className={cn("relative overflow-hidden p-5", done && "border-mint-300/50")}>
                <div className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl",
                  done ? "bg-mint-400/15" : "bg-lav-400/12"
                )} />
                <div className="relative flex items-center gap-3">
                  <span className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                    done ? "bg-mint-100 text-mint-400" : "bg-lav-100 text-lav-400"
                  )}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink-800">Unit {u.phase}: {u.name}</p>
                    <p className="text-xs font-bold text-ink-400">{u.completed}/{u.lessons} lessons · {pct}%</p>
                  </div>
                </div>
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-cream-200">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 + i * 0.05 }}
                    className={cn("h-full rounded-full", done ? "bg-mint-400" : "bg-gradient-to-r from-cyan-400 to-lav-400")}
                  />
                </div>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
