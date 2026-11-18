import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

type Tone = "success" | "error" | "info" | "warning";

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  success: { wrap: "bg-mint-100 text-mint-600", icon: CheckCircle2 },
  error: { wrap: "bg-red-500/10 text-red-400", icon: AlertTriangle },
  warning: { wrap: "bg-sun-100 text-ink-600", icon: AlertTriangle },
  info: { wrap: "bg-lav-100 text-lav-600", icon: Info },
};

/** Inline feedback banner for form/action messages. */
export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold",
        t.wrap,
        className
      )}
    >
      <t.icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
