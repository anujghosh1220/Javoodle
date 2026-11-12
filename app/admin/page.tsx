import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  HelpCircle,
  ClipboardList,
  Users,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { adminLogout } from "@/app/actions/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Admin dashboard" };

// Reads the admin auth session — cannot be prerendered.
export const instant = false;

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();

  const canQuery = isSupabaseConfigured() && hasServiceRoleKey();
  let stats: {
    students: number;
    questions: number;
    approvedQuestions: number;
    documents: number;
    exams: number;
    attempts: number;
  } | null = null;

  if (canQuery) {
    const admin = createAdminClient();
    const [students, questions, approved, documents, exams, attempts] =
      await Promise.all([
        admin.from("students").select("id", { count: "exact", head: true }),
        admin.from("questions").select("id", { count: "exact", head: true }),
        admin
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        admin.from("documents").select("id", { count: "exact", head: true }),
        admin.from("exams").select("id", { count: "exact", head: true }),
        admin
          .from("exam_attempts")
          .select("id", { count: "exact", head: true }),
      ]);
    stats = {
      students: students.count ?? 0,
      questions: questions.count ?? 0,
      approvedQuestions: approved.count ?? 0,
      documents: documents.count ?? 0,
      exams: exams.count ?? 0,
      attempts: attempts.count ?? 0,
    };
  }

  const cards = [
    { label: "Students", value: stats?.students, icon: Users, tone: "text-lav-500 bg-lav-100" },
    { label: "Questions", value: stats?.questions, icon: HelpCircle, tone: "text-mint-600 bg-mint-100" },
    { label: "Approved", value: stats?.approvedQuestions, icon: GraduationCap, tone: "text-mint-600 bg-mint-100" },
    { label: "Documents", value: stats?.documents, icon: FileText, tone: "text-sun-500 bg-sun-100" },
    { label: "Exams", value: stats?.exams, icon: ClipboardList, tone: "text-lav-500 bg-lav-100" },
    { label: "Exam attempts", value: stats?.attempts, icon: ClipboardList, tone: "text-sun-500 bg-sun-100" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Chip tone="lav">Admin console</Chip>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-800 sm:text-3xl">
            Welcome back{user.email ? `, ${user.email}` : ""}
          </h1>
          <p className="font-semibold text-ink-400">
            Question Studio, exam builder and analytics arrive in the next phases.
          </p>
        </div>
        <form action={adminLogout}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full border-2 border-cream-300 bg-white px-4 py-2 text-sm font-bold text-ink-500 transition-colors hover:border-red-300 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </header>

      {stats ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label} className="flex items-center gap-3 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-2xl font-extrabold text-ink-800">
                  {c.value ?? "—"}
                </span>
                <span className="text-xs font-bold text-ink-400">{c.label}</span>
              </span>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Database not connected"
          description="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, apply the migration, then reload. Sign-in still works once Supabase Auth is configured."
        />
      )}

      <Card className="p-5">
        <h2 className="font-extrabold text-ink-700">Coming next</h2>
        <ul className="mt-2 space-y-1.5 text-sm font-semibold text-ink-400">
          <li>· Document upload &amp; question extraction (Question Studio)</li>
          <li>· JSON import/export with validation</li>
          <li>· Examination builder &amp; paper blueprints</li>
          <li>· Performance analytics per student</li>
        </ul>
        <p className="mt-3 text-xs text-ink-400">
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            View student dashboard →
          </Link>
        </p>
      </Card>
    </main>
  );
}
