import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Users, ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { listStudentsDirectory, type StudentSort } from "@/lib/admin/students";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };
export const instant = false;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;

  const sort: StudentSort = sp.sort === "activity" || sp.sort === "name" ? sp.sort : "newest";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const result = await listStudentsDirectory({ search: q, sort, page });

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, sort: sort === "newest" ? undefined : sort, page: undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/students${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Reveal>
        <RevealItem>
          <PageHeader
            icon={Users}
            chip={<Chip tone="lav">Directory</Chip>}
            title="Student directory"
            description="Every registered student, their activity and progress — read-only."
            actions={
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"
              >
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
            }
          />
        </RevealItem>

        {/* Search + sort */}
        <RevealItem>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <form method="get" className="flex flex-wrap items-center gap-3">
              {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by name…"
                  className="w-56 pl-9"
                />
              </div>
              <Select name="sort" defaultValue={sort} className="w-auto">
                <option value="newest">Newest first</option>
                <option value="activity">Last active</option>
                <option value="name">Name A–Z</option>
              </Select>
              <button
                type="submit"
                className="rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-lav-300"
              >
                Apply
              </button>
              {q && (
                <Link href={href({ q: undefined, page: undefined })} className="text-sm font-bold text-ink-400 hover:text-lav-500">
                  Clear
                </Link>
              )}
            </form>
            <span className="ml-auto text-sm font-bold text-ink-400">
              {result.total} student{result.total === 1 ? "" : "s"}
            </span>
          </Card>
        </RevealItem>

        {!result.available ? (
          <RevealItem>
            <EmptyState
              title="Directory unavailable"
              description="The student directory needs the database connection. Check the Supabase configuration."
            />
          </RevealItem>
        ) : result.rows.length === 0 ? (
          <RevealItem>
            <EmptyState
              icon={Users}
              title={q ? "No students match" : "No students yet"}
              description={
                q
                  ? `Nothing found for “${q}”. Try a different name.`
                  : "Students appear here as soon as they register on Javoodle."
              }
            />
          </RevealItem>
        ) : (
          <>
            <RevealItem>
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-300/60 text-xs font-extrabold uppercase tracking-wide text-ink-400">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Registered</th>
                      <th className="px-5 py-3">Last active</th>
                      <th className="px-5 py-3 text-right">Lessons</th>
                      <th className="px-5 py-3 text-right">Exams</th>
                      <th className="px-5 py-3 text-right">Practice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((s) => (
                      <tr key={s.id} className="border-b border-cream-300/40 last:border-0 hover:bg-cream-100/50">
                        <td className="px-5 py-3">
                          <Link href={`/admin/students/${s.id}`} className="font-extrabold text-ink-800 hover:text-lav-500">
                            {s.name}
                          </Link>
                          <span className="block text-xs font-semibold text-ink-300">Email not collected</span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-ink-500">{fmtDate(s.registeredAt)}</td>
                        <td className="px-5 py-3 font-semibold text-ink-500">{fmtDateTime(s.lastActivityAt)}</td>
                        <td className="px-5 py-3 text-right font-bold text-ink-700">{s.lessonsCompleted}</td>
                        <td className="px-5 py-3 text-right font-bold text-ink-700">{s.examsAttempted}</td>
                        <td className="px-5 py-3 text-right font-bold text-ink-700">{s.practiceAnswers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </RevealItem>

            {result.totalPages > 1 && (
              <RevealItem>
                <div className="flex items-center justify-center gap-3">
                  {result.page > 1 ? (
                    <Link href={href({ page: String(result.page - 1) })} className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-cream-200">
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Link>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1 rounded-full bg-cream-100 px-4 py-2 text-sm font-bold text-ink-300")}>
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </span>
                  )}
                  <span className="text-sm font-bold text-ink-400">
                    Page {result.page} of {result.totalPages}
                  </span>
                  {result.page < result.totalPages ? (
                    <Link href={href({ page: String(result.page + 1) })} className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-cream-200">
                      Next <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-4 py-2 text-sm font-bold text-ink-300">
                      Next <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </RevealItem>
            )}
          </>
        )}
      </Reveal>
    </main>
  );
}
