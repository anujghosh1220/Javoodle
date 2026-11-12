import type { ReactNode } from "react";
import { Card } from "./Card";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <div className="text-4xl" aria-hidden>
        🌱
      </div>
      <h3 className="text-lg font-bold text-ink-700">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-ink-400 leading-relaxed">{description}</p>
      )}
      {children}
    </Card>
  );
}
