"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteStudentAction } from "@/app/actions/admin-students";

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await deleteStudentAction(studentId);
      if (res.ok) {
        setOpen(false);
        router.push("/admin/students");
        router.refresh();
      } else {
        setError(res.error ?? "Deletion failed. Please try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setOpen(true); }}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20"
      >
        <Trash2 className="h-4 w-4" />
        Delete student
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-student-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-cream-300/60 bg-cream-50 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 id="delete-student-title" className="text-lg font-extrabold text-ink-800">
                  Delete {studentName}?
                </h2>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-500">
                  This permanently deletes the student and all of their data —
                  sessions, lesson progress, exam attempts and answers, practice
                  history, XP and achievements. This cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-full px-4 py-2 text-sm font-bold text-ink-500 transition-colors hover:bg-cream-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
