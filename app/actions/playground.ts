"use server";

import { getStudentSession } from "@/lib/student/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { executeJava, executorConfigured } from "@/lib/coding/executor";
import { sha256Hex, MAX_SOURCE_LENGTH, MAX_STDIN_LENGTH, PLAYGROUND_TOPIC } from "@/lib/coding/shared";

/**
 * Playground run — same isolated executor and rate limits as the Coding Lab,
 * but no submission/locking. Runs are logged against the seeded sandbox
 * question row (coding_execution_runs.question_id is NOT NULL).
 */
export async function runPlaygroundCodeAction(source: string, stdin: string) {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false as const, error: "Please enter your name first." };
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase not configured");
  if (typeof source !== "string" || !source.trim() || source.length > MAX_SOURCE_LENGTH) {
    return { ok: false as const, error: "Invalid source code." };
  }
  if (typeof stdin !== "string" || stdin.length > MAX_STDIN_LENGTH) {
    return { ok: false as const, error: "Input too large." };
  }
  if (!executorConfigured()) {
    return { ok: false as const, error: "Java execution is not configured on this server yet.", status: "unavailable" as const };
  }

  const admin = createAdminClient();
  const { data: sandbox } = await admin
    .from("coding_questions")
    .select("id")
    .eq("topic", PLAYGROUND_TOPIC)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (!sandbox) {
    return { ok: false as const, error: "Playground is not set up yet — please tell your teacher.", status: "unavailable" as const };
  }

  // Same rate limits as Coding Lab runs (per student, DB-backed).
  const now = Date.now();
  const { count: recentCount } = await admin
    .from("coding_execution_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", session.studentId)
    .gte("created_at", new Date(now - 60_000).toISOString());
  if ((recentCount ?? 0) >= 5) {
    return { ok: false as const, error: "Slow down — too many runs in the last minute. Try again shortly." };
  }
  const { count: hourlyCount } = await admin
    .from("coding_execution_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", session.studentId)
    .gte("created_at", new Date(now - 3_600_000).toISOString());
  if ((hourlyCount ?? 0) >= 60) {
    return { ok: false as const, error: "Hourly run limit reached — take a break and try again later." };
  }

  const result = await executeJava(source, stdin);
  await admin.from("coding_execution_runs").insert({
    question_id: sandbox.id, student_id: session.studentId, source_hash: sha256Hex(source),
    status: result.status, stdout: result.stdout || null, stderr: result.stderr || null,
    compile_error: result.compileError, runtime_error: result.runtimeError,
    execution_time_ms: result.executionTimeMs,
    meta: { memory_used_kb: result.memoryUsedKb, playground: true },
  });
  return {
    ok: result.ok, status: result.status, stdout: result.stdout, stderr: result.stderr,
    compileError: result.compileError, runtimeError: result.runtimeError,
    executionTimeMs: result.executionTimeMs, error: result.error,
  };
}
