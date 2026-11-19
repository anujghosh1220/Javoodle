"use server";

import { revalidatePath } from "next/cache";
import { getStudentSession } from "@/lib/student/session";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLessonCompleted } from "@/lib/learn/data";

const LESSON_XP = 25;

/** Mark a lesson complete for the validated student; awards XP once. */
export async function completeLessonAction(lessonId: string) {
  const session = await getStudentSession();
  if (!session?.studentId || !session.sessionRowId) {
    return { ok: false as const, error: "Please sign in again to save progress.", xpAwarded: 0 };
  }
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return { ok: false as const, error: "Progress saving is unavailable right now.", xpAwarded: 0 };
  }

  const admin = createAdminClient();
  // Lesson must exist and be published.
  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();
  if (!lesson) return { ok: false as const, error: "Lesson not found.", xpAwarded: 0 };

  const already = await isLessonCompleted(session.studentId, lessonId);
  if (!already) {
    const { error } = await admin.from("lesson_completions").insert({
      student_id: session.studentId,
      lesson_id: lessonId,
    });
    if (error) return { ok: false as const, error: "Could not save progress — please try again.", xpAwarded: 0 };

    const { error: xpError } = await admin.from("xp_events").insert({
      student_id: session.studentId,
      session_id: session.sessionRowId,
      amount: LESSON_XP,
      reason: "lesson_completed",
      ref_id: lessonId,
    });
    // 23505 = unique violation from xp_events_lesson_once index → a concurrent
    // request already awarded this reward; treat as already completed.
    if (xpError && xpError.code !== "23505") {
      return { ok: false as const, error: "Could not save progress — please try again.", xpAwarded: 0 };
    }
  }

  revalidatePath("/learn");
  revalidatePath("/dashboard");
  return { ok: true as const, xpAwarded: already ? 0 : LESSON_XP, alreadyCompleted: already };
}
