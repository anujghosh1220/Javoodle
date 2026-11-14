import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Consistent student back button — always links to an explicit parent route. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-ink-400 transition-colors hover:bg-cream-100 hover:text-lav-500"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
