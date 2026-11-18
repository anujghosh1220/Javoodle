import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border-2 border-cream-300/60 bg-cream-100/80 backdrop-blur-sm",
        "shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]",
        interactive &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-lav-300/70 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(168,85,247,0.12)]",
        className
      )}
      {...props}
    />
  );
}
