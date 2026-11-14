"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveCodingQuestionAction, saveTestCasesAction } from "@/app/actions/coding-admin";
import { CodingQuestionFields, buildQuestionPayload, type CodingQuestionFormValues } from "@/components/admin/coding/CodingQuestionsClient";
import type { CodingDifficulty } from "@/lib/coding/shared";
import { ArrowLeft } from "lucide-react";

interface Props {
  question: {
    id: string; title: string; description: string | null; problem_statement: string | null;
    input_format: string | null; output_format: string | null; constraints: string | null;
    hints: string | null; starter_code: string | null; marks: number; difficulty: string;
    topic: string | null; time_recommendation_minutes: number | null; status: string;
  };
  testCases: Array<{ kind: string; input_data: string; expected_output: string; weight: number }>;
}

export function CodingQuestionEditor({ question, testCases }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [values, setValues] = useState<CodingQuestionFormValues>({
    title: question.title ?? "",
    question: question.problem_statement ?? question.description ?? "",
    marks: Number(question.marks) || 10,
    difficulty: (["easy", "medium", "hard"].includes(question.difficulty) ? question.difficulty : "medium") as CodingDifficulty,
    topic: question.topic ?? "",
    time: question.time_recommendation_minutes ?? null,
    hints: question.hints ?? "",
    starter_code: question.starter_code ?? "",
  });
  const [cases, setCases] = useState<Array<{ kind: "sample" | "hidden"; input_data: string; expected_output: string; weight: number }>>(
    testCases.map((t) => ({
      kind: t.kind === "hidden" ? "hidden" : "sample",
      input_data: t.input_data ?? "", expected_output: t.expected_output ?? "", weight: Number(t.weight) || 1,
    }))
  );

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.question.trim()) { setMsg({ ok: false, text: "Question text cannot be empty." }); return; }
    setBusy(true); setMsg(null);
    const fd_status = (e.currentTarget.querySelector("[name=status]") as HTMLSelectElement | null)?.value;
    const payload = { ...buildQuestionPayload(values), status: fd_status ?? question.status };
    const res = await saveCodingQuestionAction(question.id, JSON.stringify(payload));
    if (res.ok) {
      const tcRes = await saveTestCasesAction(question.id, JSON.stringify(cases));
      setMsg(tcRes.ok ? { ok: true, text: "Saved." } : { ok: false, text: tcRes.error ?? "Question saved; test cases failed." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Save failed." });
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/coding" className="inline-flex w-fit items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"><ArrowLeft className="h-4 w-4" /> Coding questions</Link>
      <h1 className="text-2xl font-extrabold text-ink-800">Edit coding question</h1>
      {msg && <p className={`rounded-xl px-4 py-2 text-sm font-bold ${msg.ok ? "bg-mint-100 text-mint-600" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}
      <Card className="p-6">
        <form onSubmit={save}>
          <CodingQuestionFields values={values} onChange={setValues} showTestCases testCases={cases} onTestCasesChange={setCases} />
          <div className="mt-4">
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">Status</label>
            <select name="status" defaultValue={question.status} className="w-full max-w-xs rounded-xl border-2 border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300">
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </div>
          <div className="mt-5"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save question + test cases"}</Button></div>
        </form>
      </Card>
    </div>
  );
}
