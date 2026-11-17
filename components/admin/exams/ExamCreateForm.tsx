"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { createExamAction } from "@/app/actions/exam-admin";

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-4 py-3 text-base font-semibold text-ink-700 outline-none focus:border-lav-300";
const labelCls = "mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-ink-400";

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
    // Straight to the question editor for the new draft.
    router.push(`/admin/exams/${res.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Chip tone="lav">New examination</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800 sm:text-3xl">
          Create exam
        </h1>
        <p className="font-semibold text-ink-400">
          Name it, set the total marks, then add your questions.
        </p>
      </header>

      <Card className="mx-auto w-full max-w-lg p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label className={labelCls} htmlFor="title">Exam name</label>
            <input
              id="title"
              name="title"
              required
              className={inputCls}
              placeholder="e.g. ICSE Class 10 Computer Applications — Prelim 2026"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="total_marks">Total marks</label>
            <input
              id="total_marks"
              name="total_marks"
              type="number"
              min={1}
              step="0.5"
              required
              className={inputCls}
              placeholder="e.g. 100"
            />
            <p className="mt-1 text-xs font-semibold text-ink-400">
              Must equal the sum of your question marks to publish.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Exam & Add Questions"}
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
