"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CircleHelp,
  Code2,
  FileText,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/app/actions/admin";
import { Wordmark } from "@/components/ui/Wordmark";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/exams", label: "Exams", icon: ClipboardList },
  { href: "/admin/questions", label: "Questions", icon: CircleHelp },
  { href: "/admin/coding", label: "Coding Lab", icon: Code2 },
  { href: "/admin/documents", label: "Documents", icon: FileText },
];

function isActive(pathname: string | null, href: string, exact?: boolean) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname.startsWith(href);
}

/** Presentational link list — `pathname` null renders all items inactive. */
function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-colors",
                active
                  ? "bg-lav-100 text-lav-600"
                  : "text-ink-400 hover:bg-cream-100 hover:text-ink-600"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Reads the live pathname — isolated so it can suspend during prerender. */
function LiveNavLinks() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

export function AdminNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-cream-300/50 bg-cream-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link href="/admin" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lav-400 to-mint-400 text-white">
            <LayoutDashboard className="h-4.5 w-4.5" />
          </span>
          <span className="hidden sm:block"><Wordmark className="text-lg font-extrabold tracking-tight" accentClass="text-lav-400" /></span>
          <span className="hidden">
            <span className="ml-2 rounded-full bg-lav-100 px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-lav-600">
              Admin
            </span>
          </span>
        </Link>

        <nav aria-label="Admin navigation" className="min-w-0 flex-1">
          {/* Suspense keeps the pathname read out of the shared prerendered
              shell — active states resolve per-request, fixing hydration
              mismatches when the shell is reused across admin routes. */}
          <Suspense fallback={<NavLinks pathname={null} />}>
            <LiveNavLinks />
          </Suspense>
        </nav>

        <form action={adminLogout} className="shrink-0">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
