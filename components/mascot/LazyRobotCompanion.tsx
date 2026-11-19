"use client";

import dynamic from "next/dynamic";
import type { CompanionMemory } from "@/lib/mascot/memory";

const RobotCompanion = dynamic(() => import("@/components/mascot/RobotCompanion").then((m) => m.RobotCompanion), {
  ssr: false,
  loading: () => null,
});

/** Decorative mascot — loaded after hydration so it never blocks FCP. */
export function LazyRobotCompanion({ memory }: { memory: CompanionMemory }) {
  return <RobotCompanion memory={memory} />;
}
