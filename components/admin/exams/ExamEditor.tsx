"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { SimpleQuestionEditor } from "@/components/admin/exams/SimpleQuestionEditor";
import { ExamDraftReview } from "@/components/admin/exams/ExamDraftReview";
import {
  updateExamDetailsAction,
  uploadExamPaperAction,
  setExamStatusAction,
  deleteExamAction,
} from "@/app/actions/exam-admin";
import type { ExamAdminDetail } from "@/lib/exams/admin-data";
import { FileText, Upload, Trash2 } from "lucide-react";

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";
const labelCls = "mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ExamEditor({
  detail,
  paperUrl,
}: {
  detail: ExamAdminDetail;
  paperUrl: string | null;
}) {
  const router = useRouter();
  const { exam, questions, paperFileName, attemptCount } = detail;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const paperInput = useRef<HTMLInputElement>(null);

  const structureFrozen = attemptCount > 0;

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setMsg(null);
    const res = await fn();
    setBusy(null);
    setMsg({ ok: res.ok, text: res.ok ? "Saved." : res.error ?? "Action failed." });
    if (res.ok) router.refresh();
    return res;
  }

  async function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    await run("details", () =>
      updateExamDetailsAction(exam.id, {
        title: val("title"),
        subject: val("subject"),
        class_name: val("class_name"),
        description: val("description") || null,
        instructions: val("instructions") || null,
        duration_minutes: Number(val("duration_minutes")),
        reading_time_minutes: Number(val("reading_time_minutes") || 0),
        total_marks: Number(val("total_marks")),
        passing_marks: val("passing_marks") ? Number(val("passing_marks")) : null,
        opens_at: val("opens_at") ? new Date(val("opens_at")).toISOString() : null,
        closes_at: val("closes_at") ? new Date(val("closes_at")).toISOString() : null,
        release_model_answers: fd.get("release_model_answers") === "on",
      })
    );
  }

  async function uploadPaper(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("paper");
    if (!(file instanceof File) || file.size === 0) {
      setMsg({ ok: false, text: "Choose a PDF file first." });
      return;
    }
    await run("paper", () => uploadExamPaperAction(exam.id, fd));
    if (paperInput.current) paperInput.current.value = "";
  }

  async function doStatus(action: "publish" | "unpublish" | "archive") {
    const labels = { publish: "Publish", unpublish: "Unpublish", archive: "Archive" };
    if (!window.confirm(`${labels[action]} this exam?`)) return;
    const res = await run(`status-${action}`, () => setExamStatusAction(exam.id, action));
    if (res.ok) setMsg({ ok: true, text: `Exam ${action === "publish" ? "published" : action === "unpublish" ? "unpublished (back to draft)" : "archived"}.` });
  }

  async function doDelete() {
    if (!window.confirm("Delete this exam permanently? This cannot be undone.")) return;
    const res = await run("delete", () => deleteExamAction(exam.id));
    if (res.ok) router.push("/admin/exams");
  }

  const statusTone =
    exam.status === "published" ? "mint" : exam.status === "archived" ? "ink" : "sun";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">{exam.title}</h1>
            <Chip tone={statusTone}>{exam.status}</Chip>
          </div>
          <p className="mt-1 font-semibold text-ink-400">
            {exam.subject} · {exam.class_name} · {exam.duration_minutes} min ·{" "}
            {Number(exam.total_marks)} marks · {attemptCount} attempt
            {attemptCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exam.status !== "published" && exam.status !== "archived" && (
            <Button size="sm" onClick={() => doStatus("publish")} disabled={busy !== null}>
              Publish
            </Button>
          )}
          {exam.status === "published" && (
            <Button size="sm" variant="secondary" onClick={() => doStatus("unpublish")} disabled={busy !== null}>
              Unpublish
            </Button>
          )}
          {exam.status !== "archived" && (
            <Button size="sm" variant="secondary" onClick={() => doStatus("archive")} disabled={busy !== null}>
              Archive
            </Button>
          )}
          {attemptCount === 0 && (
            <Button size="sm" variant="ghost" onClick={doDelete} disabled={busy !== null} className="text-red-500">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </header>

      {msg && (
        <p
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            msg.ok ? "bg-mint-100 text-mint-600" : "bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Details */}
      <Card className="p-6">
        <h2 className="font-extrabold text-ink-700">Exam details</h2>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          Changes here apply to new attempts only — started attempts keep their frozen snapshot.
        </p>
        <form onSubmit={saveDetails} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input name="title" required className={inputCls} defaultValue={exam.title} />
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input name="subject" className={inputCls} defaultValue={exam.subject} />
          </div>
          <div>
            <label className={labelCls}>Class</label>
            <input name="class_name" className={inputCls} defaultValue={exam.class_name} />
          </div>
          <div>
            <label className={labelCls}>Duration (min)</label>
            <input name="duration_minutes" type="number" min={1} required className={inputCls} defaultValue={exam.duration_minutes} />
          </div>
          <div>
            <label className={labelCls}>Reading time (min)</label>
            <input name="reading_time_minutes" type="number" min={0} className={inputCls} defaultValue={exam.reading_time_minutes} />
          </div>
          <div>
            <label className={labelCls}>Total marks</label>
            <input name="total_marks" type="number" min={1} step="0.5" required className={inputCls} defaultValue={Number(exam.total_marks)} />
          </div>
          <div>
            <label className={labelCls}>Passing marks</label>
            <input name="passing_marks" type="number" min={0} step="0.5" className={inputCls}
              defaultValue={exam.passing_marks === null ? "" : Number(exam.passing_marks)} placeholder="Optional" />
          </div>
          <div>
            <label className={labelCls}>Available from</label>
            <input name="opens_at" type="datetime-local" className={inputCls} defaultValue={toLocalInput(exam.opens_at)} />
          </div>
          <div>
            <label className={labelCls}>Available until</label>
            <input name="closes_at" type="datetime-local" className={inputCls} defaultValue={toLocalInput(exam.closes_at)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={2} className={inputCls} defaultValue={exam.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Instructions for students</label>
            <textarea name="instructions" rows={4} className={inputCls} defaultValue={exam.instructions ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-ink-600 sm:col-span-2">
            <input type="checkbox" name="release_model_answers" defaultChecked={exam.release_model_answers} className="h-4 w-4 accent-lav-500" />
            Release model answers with published results
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy !== null}>
              {busy === "details" ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Question paper PDF */}
      <Card className="p-6">
        <h2 className="font-extrabold text-ink-700">Question paper PDF</h2>
        <p className="mt-1 text-xs font-semibold text-ink-400">
          The original paper students read during the exam. Stored in the private bucket — never publicly accessible.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
            <FileText className="h-4 w-4 text-lav-500" />
            {paperFileName ? paperFileName : "No paper uploaded yet"}
          </div>
          {paperUrl && (
            <a href={paperUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-lav-500 hover:underline">
              Preview PDF ↗
            </a>
          )}
        </div>
        <form onSubmit={uploadPaper} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={paperInput}
            type="file"
            name="paper"
            accept="application/pdf"
            className="text-sm font-semibold text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-lav-100 file:px-4 file:py-2 file:text-sm file:font-bold file:text-lav-600"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={busy !== null}>
            <Upload className="h-4 w-4" /> {paperFileName ? "Replace paper" : "Upload paper"}
          </Button>
        </form>
      </Card>

      {/* Auto-extraction from the uploaded PDF */}
      <ExamDraftReview
        examId={exam.id}
        hasPaper={!!exam.paper_document_id}
        frozen={structureFrozen}
      />

      {/* Question structure — simplified flat list (single internal section) */}
      <SimpleQuestionEditor
        examId={exam.id}
        questions={questions}
        frozen={structureFrozen}
      />
    </div>
  );
}
