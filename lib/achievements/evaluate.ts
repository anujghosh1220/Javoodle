import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementStats } from "./defs";
import { MISSIONS } from "@/lib/missions/catalogue";

/**
 * Server-side achievement evaluation.
 * Gathers REAL persisted stats, evaluates code-defined criteria, and inserts
 * into student_achievements (unique constraint → idempotent).
 * Returns the defs newly unlocked by THIS call (for the unlock animation).
 */
export async function evaluateAndUnlock(studentId: string): Promise<typeof ACHIEVEMENTS> {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) return [];
  const admin = createAdminClient();

  const missionIds = MISSIONS.map((m) => m.id);
  const [xpRes, lessonsRes, missionXpRes, runsRes, daysRes, examsRes, achRes] = await Promise.all([
    admin.from("xp_events").select("amount,created_at").eq("student_id", studentId),
    admin.from("lesson_completions").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("xp_events").select("ref_id").eq("student_id", studentId).eq("reason", "mission_completed").in("ref_id", missionIds),
    admin.from("coding_execution_runs").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("xp_events").select("created_at").eq("student_id", studentId),
    admin.from("exam_attempts").select("status,total_score,exams(total_marks)").eq("student_id", studentId).in("status", ["submitted", "under_evaluation", "evaluation_completed", "result_published", "evaluated"]),
    admin.from("student_achievements").select("achievement_id,achievements(code)").eq("student_id", studentId),
  ]);

  const xp = (xpRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const activeDays = new Set((xpRes.data ?? []).map((e) => String(e.created_at).slice(0, 10))).size;
  void daysRes;

  type ExamRow = { status: string; total_score: number | null; exams: { total_marks: number | null } | Array<{ total_marks: number | null }> | null };
  const exams = (examsRes.data ?? []) as unknown as ExamRow[];
  const examRow = (e: ExamRow["exams"]) => (Array.isArray(e) ? e[0] : e);
  const percents = exams
    .map((a) => { const max = examRow(a.exams)?.total_marks; return a.total_score !== null && max ? (a.total_score / max) * 100 : null; })
    .filter((p): p is number => p !== null);

  const stats: AchievementStats = {
    xp,
    lessonsCompleted: lessonsRes.count ?? 0,
    missionsCompleted: new Set((missionXpRes.data ?? []).map((r) => r.ref_id)).size,
    totalMissions: MISSIONS.length,
    codingRuns: runsRes.count ?? 0,
    activeDays,
    examsCompleted: exams.length,
    bestExamPercent: percents.length ? Math.max(...percents) : null,
  };

  const qualified = new Set(evaluateAchievements(stats));

  // Map existing achievement rows by code.
  type AchJoin = { code: string } | Array<{ code: string }> | null;
  const owned = new Set(
    (achRes.data ?? []).map((r) => {
      const a = (r as { achievements: AchJoin }).achievements;
      return (Array.isArray(a) ? a[0]?.code : a?.code) ?? "";
    }).filter(Boolean)
  );

  // Ensure achievement definition rows exist (idempotent upsert by code).
  const { data: achRows } = await admin.from("achievements").select("id,code");
  const idByCode = new Map((achRows ?? []).map((a) => [a.code, a.id]));
  const missing = ACHIEVEMENTS.filter((d) => !idByCode.has(d.code));
  if (missing.length) {
    const { data: inserted } = await admin
      .from("achievements")
      .upsert(
        missing.map((d) => ({ code: d.code, title: d.title, description: d.description, icon: d.icon, criteria: { category: d.category, xpBonus: d.xpBonus } })),
        { onConflict: "code" }
      )
      .select("id,code");
    for (const a of inserted ?? []) idByCode.set(a.code, a.id);
    if (!achRows?.length) {
      const { data: all } = await admin.from("achievements").select("id,code");
      for (const a of all ?? []) idByCode.set(a.code, a.id);
    }
  }

  const newlyUnlocked: typeof ACHIEVEMENTS = [];
  for (const def of ACHIEVEMENTS) {
    if (!qualified.has(def.code) || owned.has(def.code)) continue;
    const achId = idByCode.get(def.code);
    if (!achId) continue;
    const { error } = await admin.from("student_achievements").upsert(
      { student_id: studentId, achievement_id: achId },
      { onConflict: "student_id,achievement_id", ignoreDuplicates: true }
    );
    if (!error) {
      owned.add(def.code);
      newlyUnlocked.push(def);
      if (def.xpBonus > 0) {
        const { error: xpErr } = await admin.from("xp_events").insert({
          student_id: studentId,
          amount: def.xpBonus,
          reason: "achievement_bonus",
          ref_id: achId,
        });
        // 23505 = bonus already awarded by a concurrent evaluation → skip.
        void xpErr;
      }
    }
  }
  return newlyUnlocked;
}
