"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { reviewCodingSubmissionAction } from "@/app/actions/coding-admin";
import { ArrowLeft } from "lucide-react";

const inputCls = "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";

interface SubRow {
    id: string;
    attempt_number: number;
    review_status: "pending" | "reviewed" | "resubmit_requested";
    marks_awarded: number | null;
    created_at: string;
    coding_questions?: { title?: string } | Array<{ title?: string }> | null;
    students?: { display_name?: string } | Array<{ display_name?: string }> | null;
  }
  export function CodingSubmissionsClient({ submissions }: { submissions: SubRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  interface SubDetail {
    submission: { source_code: string; last_output: string | null; last_status: string | null; execution_meta?: { execution_time_ms?: number } | null };
    runs: Array<{ id: string }>;
  }
  const [detail, setDetail] = useState<SubDetail | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle(id: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setDetail(null); setMarks(""); setFeedback("");
    const res = await fetch(`/api/admin/coding/submissions/${id}`);
    if (res.ok) setDetail(await res.json());
  }

  async function review(id: string, status: "reviewed" | "resubmit_requested") {
    setBusy(true);
    await reviewCodingSubmissionAction(id, marks === "" ? null : Number(marks), feedback, status);
    setBusy(false); setOpen(null); router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/coding" className="inline-flex w-fit items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"><ArrowLeft className="h-4 w-4" /> Coding questions</Link>
      <div>
        <h1 className="text-2xl font-extrabold text-ink-800">Coding Submissions</h1>
        <p className="mt-1 text-sm font-semibold text-ink-400">{submissions.length} submission{submissions.length === 1 ? "" : "s"}</p>
      </div>
      <div className="flex flex-col gap-3">
        {submissions.map((s) => (
          <Card key={s.id} className="p-4">
            <button onClick={() => toggle(s.id)} className="flex w-full flex-wrap items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-ink-800">{(Array.isArray(s.coding_questions) ? s.coding_questions[0]?.title : s.coding_questions?.title) ?? "Question"}</p>
                <p className="text-xs font-bold text-ink-400">
                  {(Array.isArray(s.students) ? s.students[0]?.display_name : s.students?.display_name) ?? "Student"} · attempt {s.attempt_number} · {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
              <Chip tone={s.review_status === "reviewed" ? "mint" : s.review_status === "resubmit_requested" ? "sun" : "lav"}>{s.review_status.replace(/_/g, " ")}</Chip>
              {s.marks_awarded !== null && <Chip tone="ink">{s.marks_awarded} marks</Chip>}
            </button>
            {open === s.id && (
              <div className="mt-4 border-t border-cream-200 pt-4">
                {!detail ? <p className="text-sm font-semibold text-ink-400">Loading…</p> : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-ink-400">Source code</h3>
                      <pre className="mt-1 max-h-72 overflow-auto rounded-xl bg-[#1e1e1e] p-3 font-mono text-xs text-neutral-200">{detail.submission.source_code}</pre>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div><h3 className="text-xs font-extrabold uppercase text-ink-400">Last output</h3><pre className="mt-1 max-h-32 overflow-auto rounded-xl bg-cream-50 p-2 font-mono text-xs">{detail.submission.last_output || "—"}</pre></div>
                      <div><h3 className="text-xs font-extrabold uppercase text-ink-400">Status / meta</h3><p className="mt-1 text-xs font-bold text-ink-500">{detail.submission.last_status} · {detail.submission.execution_meta?.execution_time_ms ?? "?"}ms</p></div>
                    </div>
                    {detail.runs?.length > 0 && <p className="text-xs font-bold text-ink-400">{detail.runs.length} recent execution run{detail.runs.length === 1 ? "" : "s"} on record.</p>}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input placeholder="Marks" type="number" min={0} value={marks} onChange={(e) => setMarks(e.target.value)} className={inputCls} />
                      <input placeholder="Feedback (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} className={`${inputCls} sm:col-span-2`} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => review(s.id, "reviewed")}>Award & mark reviewed</Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => review(s.id, "resubmit_requested")}>Request resubmission</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
        {submissions.length === 0 && <p className="text-sm font-semibold text-ink-400">No submissions yet.</p>}
      </div>
    </div>
  );
}
