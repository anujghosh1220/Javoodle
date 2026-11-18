import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sprout } from "lucide-react";
import { Card } from "./Card";

export function EmptyState({
  title,
  description,
  icon: Icon = Sprout,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-lav-100 to-mint-100 text-lav-500">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-extrabold text-ink-700">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm font-semibold leading-relaxed text-ink-400">
          {description}
        </p>
      )}
      {children}
    </Card>
  );
}
