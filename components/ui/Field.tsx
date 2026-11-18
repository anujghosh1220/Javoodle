import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const controlCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3.5 py-2.5 text-sm font-semibold text-ink-700 placeholder:text-ink-300 outline-none transition-colors focus:border-lav-400 focus:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60";

export function Label({
  children,
  className,
  htmlFor,
}: {
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-ink-400",
        className
      )}
    >
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlCls, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlCls, "leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlCls, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

/** Label + control wrapper with optional hint/error text. */
export function Field({
  label,
  labelFor,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  labelFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={labelFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-bold text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs font-semibold text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
