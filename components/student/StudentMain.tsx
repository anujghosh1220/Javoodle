"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Student main wrapper — full-width for immersive routes (coding workspace). */
export function StudentMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = /^\/coding\/[^/]+/.test(pathname);
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8",
        wide ? "max-w-[1800px]" : "max-w-5xl"
      )}
    >
      {children}
    </main>
  );
}
