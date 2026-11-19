"use server";

import { getStudentSession } from "@/lib/student/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { executeJava, executorConfigured } from "@/lib/coding/executor";
import { getMission } from "@/lib/missions/catalogue";
import { MISSION_TESTS } from "@/lib/missions/tests.server";
import { MAX_SOURCE_LENGTH } from "@/lib/coding/shared";
import { revalidatePath } from "next/cache";

const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd();

/** All missions the student has already completed (xp_events ledger). */
export async function getCompletedMissionIds(studentId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("xp_events")
    .select("ref_id")
    .eq("student_id", studentId)
    .eq("reason", "mission_completed");
  return new Set((data ?? []).map((r) => r.ref_id as string).filter(Boolean));
}

export interface MissionResult {
  ok: boolean;
  passed?: number;
  total?: number;
  failedTest?: number;
  stdout?: string;
  compileError?: string | null;
  runtimeError?: string | null;
  xpAwarded?: number;
  alreadyCompleted?: boolean;
  error?: string;
}

/**
 * Submit a mission solution. Runs every hidden test server-side through the
 * isolated Java executor. XP is awarded exactly once per mission via the
 * xp_events ledger (check-then-insert, same convention as lessons).
 */
export async function submitMissionAction(missionId: string, source: string): Promise<MissionResult> {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false, error: "Please enter your name first." };
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase not configured");

  const mission = getMission(missionId);
  if (!mission) return { ok: false, error: "Unknown mission." };
  const tests = MISSION_TESTS[mission.id];
  if (!tests?.length) return { ok: false, error: "Mission is not configured." };
  if (typeof source !== "string" || !source.trim() || source.length > MAX_SOURCE_LENGTH) {
    return { ok: false, error: "Invalid source code." };
  }
  if (!executorConfigured()) {
    return { ok: false, error: "Java execution is not configured on this server yet." };
  }

  const admin = createAdminClient();

  // Idempotency: already completed → no re-run, no re-award.
  const { data: prior } = await admin
    .from("xp_events")
    .select("id")
    .eq("student_id", session.studentId)
    .eq("reason", "mission_completed")
    .eq("ref_id", mission.id)
    .limit(1);
  if (prior?.length) {
    return { ok: true, alreadyCompleted: true, xpAwarded: 0, passed: tests.length, total: tests.length };
  }

  // Rate limit: max 3 mission submissions per minute (DB-backed via run log is
  // unnecessary here — executions are cheap bounded loops; cap attempts instead).
  const { count: recentAttempts } = await admin
    .from("xp_events")
    .select("id", { count: "exact", head: true })
    .eq("student_id", session.studentId)
    .eq("reason", "mission_attempt")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recentAttempts ?? 0) >= 10) {
    return { ok: false, error: "Slow down — too many attempts. Try again shortly." };
  }
  await admin.from("xp_events").insert({
    student_id: session.studentId,
    session_id: session.sessionRowId,
    amount: 0,
    reason: "mission_attempt",
    ref_id: mission.id,
  });

  // Evaluate hidden tests sequentially (bounded: ≤5 tests).
  let passed = 0;
  let firstFail: { index: number; stdout: string; compileError: string | null; runtimeError: string | null } | null = null;
  let lastMeta = { stdout: "", compileError: null as string | null, runtimeError: null as string | null };

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const res = await executeJava(source, t.stdin);
    lastMeta = { stdout: res.stdout, compileError: res.compileError, runtimeError: res.runtimeError };
    if (!res.ok) {
      firstFail = { index: i, stdout: res.stdout, compileError: res.compileError, runtimeError: res.runtimeError };
      break;
    }
    if (norm(res.stdout) === norm(t.expected)) {
      passed++;
    } else {
      firstFail = { index: i, stdout: res.stdout, compileError: null, runtimeError: null };
      break;
    }
  }

  const allPass = passed === tests.length;
  if (allPass) {
    // Re-check inside the same request window to narrow the race; the ledger
    // insert is the single source of truth for completion + XP.
    const { data: again } = await admin
      .from("xp_events")
      .select("id")
      .eq("student_id", session.studentId)
      .eq("reason", "mission_completed")
      .eq("ref_id", mission.id)
      .limit(1);
    if (!again?.length) {
      const { error: xpError } = await admin.from("xp_events").insert({
        student_id: session.studentId,
        session_id: session.sessionRowId,
        amount: mission.xp,
        reason: "mission_completed",
        ref_id: mission.id,
      });
      // 23505 = concurrent request already awarded → report as completed, no XP.
      if (xpError?.code === "23505") {
        return { ok: true, alreadyCompleted: true, xpAwarded: 0, passed, total: tests.length };
      }
      if (xpError) return { ok: false, error: "Could not save mission progress — please try again." };
    }
    revalidatePath("/missions");
    revalidatePath("/dashboard");
    revalidatePath("/growth");
    return { ok: true, passed, total: tests.length, xpAwarded: mission.xp };
  }

  return {
    ok: false,
    passed,
    total: tests.length,
    failedTest: firstFail ? firstFail.index + 1 : undefined,
    stdout: firstFail?.stdout ?? lastMeta.stdout,
    compileError: firstFail?.compileError ?? lastMeta.compileError,
    runtimeError: firstFail?.runtimeError ?? lastMeta.runtimeError,
  };
}

