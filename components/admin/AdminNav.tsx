"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/questions/upload", label: "Upload" },
  { href: "/admin/questions/import", label: "Import JSON" },
  { href: "/admin/questions/review", label: "Review" },
  { href: "/admin/questions/bank", label: "Question bank" },
  { href: "/admin/documents", label: "Documents" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b-2 border-cream-200 pb-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
            pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href))
              ? "bg-lav-100 text-lav-600"
              : "text-ink-400 hover:bg-cream-100 hover:text-ink-600"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
