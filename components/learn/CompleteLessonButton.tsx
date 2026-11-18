"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PartyPopper, Loader2 } from "lucide-react";
import { completeLessonAction } from "@/app/actions/learn";
import { emitRobotEvent } from "@/lib/mascot/events";

export function CompleteLessonButton({
  lessonId,
  completed,
  nextHref,
  nextTitle,
}: {
  lessonId: string;
  completed: boolean;
  nextHref: string | null;
  nextTitle: string | null;
}) {
  const [done, setDone] = useState(completed);
  const [xp, setXp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const res = await completeLessonAction(lessonId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setXp(res.xpAwarded > 0 ? res.xpAwarded : null);
      if (res.xpAwarded > 0) emitRobotEvent("celebrating");
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-mint-300/60 bg-mint-50 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-mint-500" />
        <div>
          <p className="text-lg font-extrabold text-ink-800">Lesson complete!</p>
          <p className="text-sm font-semibold text-ink-500">
            {xp ? `+${xp} XP earned. ` : ""}Nice work — keep the momentum going.
          </p>
        </div>
        {nextHref && nextTitle && (
          <a
            href={nextHref}
            className="inline-flex items-center gap-2 rounded-full bg-lav-400 px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_4px_0_var(--color-lav-600)] transition-all hover:bg-lav-300 active:translate-y-0.5 active:shadow-none"
          >
            <PartyPopper className="h-4 w-4" /> Next: {nextTitle}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleComplete}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-mint-300 px-8 py-3 text-base font-extrabold text-ink-800 shadow-[0_6px_0_var(--color-mint-600)] transition-all hover:bg-mint-200 active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        {pending ? "Saving…" : "Mark lesson complete"}
      </button>
      <p className="text-xs font-semibold text-ink-400">Earns 25 XP — progress is saved to your account.</p>
      {error && <p className="text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
}
