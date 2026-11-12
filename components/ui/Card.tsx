import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border-2 border-cream-200 bg-white/80 backdrop-blur-sm",
        "shadow-[0_10px_30px_-12px_rgba(76,60,140,0.15)]",
        className
      )}
      {...props}
    />
  );
}
