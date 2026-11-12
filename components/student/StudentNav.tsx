"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  Code2,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Brain },
  { href: "/playground", label: "Playground", icon: Code2 },
  { href: "/exams", label: "Exams", icon: ClipboardList },
  { href: "/growth", label: "Growth", icon: TrendingUp },
];

export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Student navigation"
      className="sticky top-0 z-40 border-b-2 border-cream-200 bg-cream-50/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-ink-800">
            Jav<span className="text-lav-400">oo</span>dl<span className="text-mint-500">e</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-colors",
                    active
                      ? "bg-lav-100 text-lav-600"
                      : "text-ink-400 hover:bg-cream-100 hover:text-ink-600"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
