import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "sun" | "mint" | "destructive";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-lav-400 text-white shadow-[0_6px_0_var(--color-lav-600)] hover:bg-lav-300 hover:shadow-[0_6px_0_var(--color-lav-500),0_0_24px_-6px_rgba(168,85,247,0.55)] active:translate-y-1 active:shadow-none",
  secondary:
    "bg-cream-200 text-ink-800 border-2 border-cream-300 hover:border-lav-300 hover:bg-lav-100",
  outline:
    "border-2 border-lav-300/60 bg-transparent text-lav-500 hover:border-lav-400 hover:bg-lav-100/60",
  ghost: "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
  sun: "bg-sun-300 text-ink-800 shadow-[0_6px_0_var(--color-sun-500)] hover:bg-sun-200 active:translate-y-1 active:shadow-none",
  mint: "bg-mint-300 text-ink-800 shadow-[0_6px_0_var(--color-mint-600)] hover:bg-mint-200 active:translate-y-1 active:shadow-none",
  destructive:
    "bg-red-500/90 text-white shadow-[0_6px_0_rgba(220,38,38,0.55)] hover:bg-red-400 active:translate-y-1 active:shadow-none",
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
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all duration-150",
        "focus-visible:outline-3 focus-visible:outline-lav-300 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children as ReactNode}
    </button>
  );
}
