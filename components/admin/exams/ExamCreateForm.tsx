"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { createExamAction } from "@/app/actions/exam-admin";

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";
const labelCls = "mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400";

export function ExamCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createExamAction(fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create the exam.");
      return;
    }
    router.push(`/admin/exams/${res.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Chip tone="lav">New examination</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800 sm:text-3xl">
          Exam details
        </h1>
        <p className="font-semibold text-ink-400">
          Set up the paper metadata first — you&apos;ll add sections, questions
          and marks on the next screen.
        </p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="title">Exam title</label>
              <input id="title" name="title" required className={inputCls}
                placeholder="e.g. ICSE Class 10 Computer Applications — Prelim 2026" />
            </div>
            <div>
              <label className={labelCls} htmlFor="subject">Subject</label>
              <input id="subject" name="subject" className={inputCls} defaultValue="Computer Applications" />
            </div>
            <div>
              <label className={labelCls} htmlFor="class_name">Class</label>
              <input id="class_name" name="class_name" className={inputCls} defaultValue="ICSE Class 10" />
            </div>
            <div>
              <label className={labelCls} htmlFor="duration_minutes">Duration (minutes)</label>
              <input id="duration_minutes" name="duration_minutes" type="number" min={1} required className={inputCls} defaultValue={120} />
            </div>
            <div>
              <label className={labelCls} htmlFor="reading_time_minutes">Reading time (minutes, optional)</label>
              <input id="reading_time_minutes" name="reading_time_minutes" type="number" min={0} className={inputCls} defaultValue={0} />
            </div>
            <div>
              <label className={labelCls} htmlFor="total_marks">Total marks</label>
              <input id="total_marks" name="total_marks" type="number" min={1} step="0.5" required className={inputCls} defaultValue={100} />
            </div>
            <div>
              <label className={labelCls} htmlFor="passing_marks">Passing marks (optional)</label>
              <input id="passing_marks" name="passing_marks" type="number" min={0} step="0.5" className={inputCls} placeholder="e.g. 33" />
            </div>
            <div>
              <label className={labelCls} htmlFor="opens_at">Available from (optional)</label>
              <input id="opens_at" name="opens_at" type="datetime-local" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="closes_at">Available until (optional)</label>
              <input id="closes_at" name="closes_at" type="datetime-local" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="description">Description (shown to students)</label>
              <textarea id="description" name="description" rows={2} className={inputCls}
                placeholder="Short summary of the paper." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="instructions">Instructions for students</label>
              <textarea id="instructions" name="instructions" rows={4} className={inputCls}
                placeholder={"e.g. Answer all questions. Program questions should be written in Java. Write your name on every answer sheet..."} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="paper">Question paper PDF (required before publishing)</label>
              <input id="paper" name="paper" type="file" accept="application/pdf" required className={inputCls} />
              <p className="mt-1 text-xs font-semibold text-ink-400">
                Stored privately — students see it only through a secure link while their exam is running.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-ink-600 sm:col-span-2">
              <input type="checkbox" name="release_model_answers" className="h-4 w-4 accent-lav-500" />
              Release model answers to students with the published result
            </label>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create exam"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
