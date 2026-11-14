import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { data: submission } = await admin.from("coding_submissions").select("*").eq("id", id).maybeSingle();
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: runs } = await admin
    .from("coding_execution_runs")
    .select("id,status,stdout,execution_time_ms,created_at")
    .eq("student_id", (submission as { student_id: string }).student_id)
    .eq("question_id", (submission as { question_id: string }).question_id)
    .order("created_at", { ascending: false })
    .limit(10);
  return NextResponse.json({ submission, runs: runs ?? [] });
}
