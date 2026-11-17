"use server";

import { revalidatePath } from "next/cache";
import { getStudentSession } from "@/lib/student/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { executeJava } from "@/lib/coding/executor";
import { sha256Hex, MAX_SOURCE_LENGTH, MAX_STDIN_LENGTH } from "@/lib/coding/shared";

async function student() {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false as const, error: "Please enter your name first.", admin: null, studentId: null };
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase not configured");
  return { ok: true as const, admin: createAdminClient(), studentId: session.studentId, error: null };
}

/** Run student Java code in the isolated executor; logs the run. */
export async function runCodingCodeAction(questionId: string, source: string, stdin: string) {
  const s = await student();
  if (!s.ok) return { ok: false as const, error: s.error };
  if (typeof source !== "string" || !source.trim() || source.length > MAX_SOURCE_LENGTH) {
    return { ok: false as const, error: "Invalid source code." };
  }
  if (typeof stdin !== "string" || stdin.length > MAX_STDIN_LENGTH) {
    return { ok: false as const, error: "Input too large." };
  }
  const { data: q } = await s.admin.from("coding_questions").select("id,status").eq("id", questionId).eq("status", "published").maybeSingle();
  if (!q) return { ok: false as const, error: "Question not available." };

  // Locked questions cannot be run again.
  const { data: existing } = await s.admin
    .from("coding_submissions")
    .select("id")
    .eq("student_id", s.studentId)
    .eq("question_id", questionId)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false as const, error: "You already submitted this question — it's locked." };

  // Rate limit (DB-backed, serverless-safe): burst cap per minute and an
  // hourly cap per student, counted from the immutable run log.
  const now = Date.now();
  const { count: recentCount } = await s.admin
    .from("coding_execution_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.studentId)
    .gte("created_at", new Date(now - 60_000).toISOString());
  if ((recentCount ?? 0) >= 5) {
    return { ok: false as const, error: "Slow down — too many runs in the last minute. Try again shortly." };
  }
  const { count: hourlyCount } = await s.admin
    .from("coding_execution_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.studentId)
    .gte("created_at", new Date(now - 3_600_000).toISOString());
  if ((hourlyCount ?? 0) >= 60) {
    return { ok: false as const, error: "Hourly run limit reached — take a break and try again later." };
  }

  const result = await executeJava(source, stdin);
  const hash = sha256Hex(source);
  await s.admin.from("coding_execution_runs").insert({
    question_id: questionId, student_id: s.studentId, source_hash: hash,
    status: result.status, stdout: result.stdout || null, stderr: result.stderr || null,
    compile_error: result.compileError, runtime_error: result.runtimeError,
    execution_time_ms: result.executionTimeMs,
    meta: { memory_used_kb: result.memoryUsedKb },
  });
  return {
    ok: result.ok, status: result.status, stdout: result.stdout, stderr: result.stderr,
    compileError: result.compileError, runtimeError: result.runtimeError,
    executionTimeMs: result.executionTimeMs, sourceHash: hash,
    error: result.error,
  };
}

/** Submit only if the exact source hash has a successful run for this student+question. */
export async function submitCodingSolutionAction(questionId: string, source: string, sourceHash: string) {
  const s = await student();
  if (!s.ok) return { ok: false as const, error: s.error };
  if (typeof source !== "string" || !source.trim() || source.length > MAX_SOURCE_LENGTH) {
    return { ok: false as const, error: "Invalid source code." };
  }
  if (sha256Hex(source) !== sourceHash) {
    return { ok: false as const, error: "Source changed — run the code again before submitting." };
  }
  const { data: q } = await s.admin.from("coding_questions").select("id,status").eq("id", questionId).eq("status", "published").maybeSingle();
  if (!q) return { ok: false as const, error: "Question not available." };

  // Locked questions cannot be submitted again (also guards double-submit races).
  const { data: existingSub } = await s.admin
    .from("coding_submissions")
    .select("id")
    .eq("student_id", s.studentId)
    .eq("question_id", questionId)
    .limit(1)
    .maybeSingle();
  if (existingSub) return { ok: false as const, error: "You already submitted this question — it's locked." };

  // Server-side proof: a successful execution run must exist for this exact
  // source hash, student and question. Client claims are never trusted.
  const { data: run } = await s.admin
    .from("coding_execution_runs")
    .select("id,status,stdout,execution_time_ms,meta")
    .eq("student_id", s.studentId)
    .eq("question_id", questionId)
    .eq("source_hash", sourceHash)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) {
    return { ok: false as const, error: "No successful run found for this exact code — run it first." };
  }

  const { count } = await s.admin
    .from("coding_submissions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", s.studentId)
    .eq("question_id", questionId);

  const { data: sub, error } = await s.admin.from("coding_submissions").insert({
    question_id: questionId, student_id: s.studentId, source_code: source,
    last_output: (run as { stdout?: string | null }).stdout ?? null, last_status: "success",
    execution_meta: { run_id: (run as { id: string }).id, execution_time_ms: (run as { execution_time_ms?: number | null }).execution_time_ms, memory_used_kb: ((run as { meta?: { memory_used_kb?: number } | null }).meta)?.memory_used_kb ?? null },
    attempt_number: (count ?? 0) + 1,
  }).select("id").single();
  if (error || !sub) return { ok: false as const, error: error?.message ?? "Submit failed." };
  revalidatePath("/coding");
  return { ok: true as const, submissionId: sub.id };
}
