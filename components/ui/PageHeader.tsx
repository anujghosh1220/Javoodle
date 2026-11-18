import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Consistent page header across student + admin surfaces.
 * Renders: optional icon chip, eyebrow chip, title, description, actions.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  chip,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  chip?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        {chip && <div className="mb-1.5">{chip}</div>}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lav-100 to-mint-100 text-lav-500">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-800 sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1.5 max-w-2xl font-semibold text-ink-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
