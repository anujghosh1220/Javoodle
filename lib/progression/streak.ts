import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";

/** Consecutive UTC days with ≥1 xp_event, ending today or yesterday. */
export function streakFromDates(dates: string[], now: Date = new Date()): number {
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let streak = 0;
  const cursor = new Date(today);
  // streak must include today or yesterday to be "active"
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getLearningStreak(studentId: string | null): Promise<number> {
  if (!studentId || !isSupabaseConfigured() || !hasServiceRoleKey()) return 0;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data } = await admin
    .from("xp_events")
    .select("created_at")
    .eq("student_id", studentId)
    .gte("created_at", since);
  return streakFromDates((data ?? []).map((r) => r.created_at));
}
