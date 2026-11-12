import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "sun" | "mint";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-lav-400 text-white shadow-[0_6px_0_var(--color-lav-600)] hover:bg-lav-300 active:translate-y-1 active:shadow-none",
  secondary:
    "bg-white text-ink-700 border-2 border-cream-300 hover:border-lav-300 hover:bg-lav-50",
  ghost: "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
  sun: "bg-sun-300 text-ink-800 shadow-[0_6px_0_var(--color-sun-500)] hover:bg-sun-200 active:translate-y-1 active:shadow-none",
  mint: "bg-mint-300 text-ink-800 shadow-[0_6px_0_var(--color-mint-600)] hover:bg-mint-200 active:translate-y-1 active:shadow-none",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-full",
  md: "px-6 py-3 text-base rounded-full",
  lg: "px-8 py-4 text-lg rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all duration-150",
        "focus-visible:outline-3 focus-visible:outline-lav-300 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
