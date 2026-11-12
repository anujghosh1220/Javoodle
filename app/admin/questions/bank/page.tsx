import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Question bank" };
export const instant = false;

const TYPES = ["mcq","fib","truefalse","output","error","theory","program"];

export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();

  let q = admin
    .from("questions")
    .select("id, text, type, marks, difficulty, status, answer_status, source_year, source_question_number, version, topics(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.q) q = q.ilike("text", `%${sp.q}%`);
  if (sp.type && TYPES.includes(sp.type)) q = q.eq("type", sp.type);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.answer) q = q.eq("answer_status", sp.answer);
  if (sp.year) q = q.eq("source_year", Number(sp.year));
  if (sp.difficulty) q = q.eq("difficulty", Number(sp.difficulty));

  const [{ data: questions }, { data: topics }] = await Promise.all([
    q,
    admin.from("topics").select("id, name").order("phase").order("order_index"),
  ]);

  const input = "rounded-lg border-2 border-cream-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 focus:border-lav-300 focus:outline-none";

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold text-ink-800">Question bank</h1>
        <p className="font-semibold text-ink-400">{questions?.length ?? 0} question(s)</p>
      </div>

      <form className="flex flex-wrap gap-2" action="/admin/questions/bank" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search text…" className={input} />
        <select name="type" defaultValue={sp.type ?? ""} className={input}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={input}>
          <option value="">All statuses</option>
          {["draft","pending","pending_review","approved","rejected","needs_revision"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="answer" defaultValue={sp.answer ?? ""} className={input}>
          <option value="">Any answer</option>
          {["unverified","approved","rejected","needs_revision"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="topic" defaultValue={sp.topic ?? ""} className={input}>
          <option value="">All topics</option>
          {(topics ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="difficulty" defaultValue={sp.difficulty ?? ""} className={input}>
          <option value="">Any difficulty</option>
          {[1,2,3,4,5].map((d) => <option key={d} value={d}>★{d}</option>)}
        </select>
        <input name="year" defaultValue={sp.year} placeholder="Year" className={`${input} w-24`} />
        <button className="rounded-lg bg-lav-400 px-4 py-1.5 text-sm font-bold text-white hover:bg-lav-300">Filter</button>
      </form>

      {!questions?.length ? (
        <EmptyState title="No questions match" description="Adjust filters or import questions first." />
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <Link key={q.id} href={`/admin/questions/${q.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-all hover:border-lav-300">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-700">
                    {q.source_question_number ? `${q.source_question_number} · ` : ""}{q.text}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-400">
                    {q.type} · {Number(q.marks)}m · diff {q.difficulty} · v{q.version}
                    {q.topics ? ` · ${(q.topics as unknown as { name: string }[])[0]?.name ?? (q.topics as unknown as { name: string }).name}` : ""}{q.source_year ? ` · ${q.source_year}` : ""}
                  </p>
                </div>
                <Chip tone={q.status === "approved" ? "mint" : q.status === "rejected" ? "lav" : "sun"}>{q.status.replace("_"," ")}</Chip>
                <Chip tone={q.answer_status === "approved" ? "mint" : "sun"}>A:{q.answer_status}</Chip>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
