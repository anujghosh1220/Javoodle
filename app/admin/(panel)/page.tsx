import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  FileText,
  HelpCircle,
  ClipboardList,
  Users,
  GraduationCap,
  Code2,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Admin dashboard" };

// Reads the admin auth session — cannot be prerendered.
export const instant = false;

export default async function AdminDashboardPage() {
  // Request-time rendering: auth/session code reads the clock (JWT expiry
  // checks), which is unstable during prerendering under Cache Components.
  await connection();
  const { user } = await requireAdmin();

  const canQuery = isSupabaseConfigured() && hasServiceRoleKey();
  let stats: {
    students: number;
    questions: number;
    approvedQuestions: number;
    documents: number;
    exams: number;
    attempts: number;
    codingQuestions: number;
  } | null = null;

  if (canQuery) {
    const admin = createAdminClient();
    const [students, questions, approved, documents, exams, attempts, coding] =
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
        admin
          .from("coding_questions")
          .select("id", { count: "exact", head: true }),
      ]);
    stats = {
      students: students.count ?? 0,
      questions: questions.count ?? 0,
      approvedQuestions: approved.count ?? 0,
      documents: documents.count ?? 0,
      exams: exams.count ?? 0,
      attempts: attempts.count ?? 0,
      codingQuestions: coding.count ?? 0,
    };
  }

  const cards = [
    { label: "Students", value: stats?.students ?? 0, icon: Users, tone: "text-lav-500 bg-lav-100" },
    { label: "Questions", value: stats?.questions ?? 0, icon: HelpCircle, tone: "text-mint-600 bg-mint-100" },
    { label: "Approved", value: stats?.approvedQuestions ?? 0, icon: GraduationCap, tone: "text-mint-600 bg-mint-100" },
    { label: "Coding questions", value: stats?.codingQuestions ?? 0, icon: Code2, tone: "text-cyan-400 bg-cyan-400/10" },
    { label: "Documents", value: stats?.documents ?? 0, icon: FileText, tone: "text-sun-500 bg-sun-100" },
    { label: "Exams", value: stats?.exams ?? 0, icon: ClipboardList, tone: "text-lav-500 bg-lav-100" },
    { label: "Exam attempts", value: stats?.attempts ?? 0, icon: ClipboardList, tone: "text-sun-500 bg-sun-100" },
  ];

  const sections = [
    { href: "/admin/exams", title: "Exam management", desc: "Create papers, publish them, evaluate submissions and release results.", icon: ClipboardList, tone: "bg-lav-100 text-lav-500" },
    { href: "/admin/questions", title: "Question Studio", desc: "Upload documents, extract questions, import JSON and review before publishing.", icon: HelpCircle, tone: "bg-mint-100 text-mint-600" },
    { href: "/admin/coding", title: "Coding Lab", desc: "Author Java challenges, manage test cases and review student submissions.", icon: Code2, tone: "bg-cyan-400/10 text-cyan-400" },
    { href: "/admin/documents", title: "Documents", desc: "View, extract, preview, retry and delete uploaded source documents.", icon: FileText, tone: "bg-sun-100 text-sun-500" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Reveal>
        <RevealItem>
          <PageHeader
            chip={<Chip tone="lav">Admin console</Chip>}
            title={user.email ? `Welcome back, ${user.email.split("@")[0]}` : "Welcome back"}
            description="Question Studio, exam builder, coding lab and evaluation — all in one place."
            actions={
              <Link href="/admin/exams/new">
                <Button size="sm"><ClipboardList className="h-4 w-4" /> New exam</Button>
              </Link>
            }
          />
        </RevealItem>

        {stats ? (
          <RevealItem className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
            ))}
          </RevealItem>
        ) : (
          <RevealItem>
            <EmptyState
              icon={FileText}
              title="Database not connected"
              description="Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, apply the migration, then reload. Sign-in still works once Supabase Auth is configured."
            />
          </RevealItem>
        )}

        <RevealItem>
          <section className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="block">
                <Card interactive className="flex h-full items-start gap-3 p-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${s.tone}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-extrabold text-ink-800">{s.title}</span>
                    <span className="text-sm font-semibold text-ink-400">{s.desc}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </section>
        </RevealItem>
      </Reveal>
    </main>
  );
}
