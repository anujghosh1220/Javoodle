import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border-2 border-cream-300/60 bg-cream-100/80 backdrop-blur-sm",
        "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]",
        className
      )}
      {...props}
    />
  );
}
