"use client";

import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";

/**
 * Atmosphere card — the academy ships pre-configured; visuals adapt
 * automatically per route. Sound is always on (browser gesture-gated).
 */
export function AtmosphereSettings() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lav-100 text-lav-400">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-ink-800">Atmosphere</h2>
          <p className="text-sm font-semibold text-ink-400">Javoodle&rsquo;s immersive learning environment</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-400">
        Visuals and sound adapt automatically to each page — calm during exams, alive everywhere else.
      </p>
    </Card>
  );
}
