"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Brain, Code2, ClipboardList, FlaskConical, TrendingUp, Target, Eye, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/ui/Wordmark";

const items = [
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Brain },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/coding", label: "Coding Lab", icon: Code2 },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/visualizer", label: "Visualizer", icon: Eye },
  { href: "/projects", label: "Projects", icon: Hammer },
  { href: "/exams", label: "Exams", icon: ClipboardList },
  { href: "/growth", label: "Growth", icon: TrendingUp },
];

export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Student navigation"
      className="sticky top-0 z-40 border-b border-cream-300/50 bg-cream-50/85 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Wordmark className="text-xl font-extrabold tracking-tight" accentClass="text-lav-400" />
        </Link>

        <ul className="flex items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-colors",
                    active ? "text-lav-600" : "text-ink-400 hover:text-ink-600"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="student-nav-active"
                      className="absolute inset-0 rounded-full bg-lav-100"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon className="relative h-4 w-4" />
                  <span className="relative hidden sm:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
