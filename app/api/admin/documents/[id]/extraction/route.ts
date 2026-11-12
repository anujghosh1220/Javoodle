import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("id,original_filename,filename")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const { data: ex } = await admin
    .from("document_extractions")
    .select("id,extracted_text,status,attempt,warnings,structured,page_count")
    .eq("document_id", id)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  const d = doc as { original_filename?: string | null; filename: string };
  const e = ex as { id?: string; extracted_text?: string | null; status?: string | null; attempt?: number | null; warnings?: unknown; structured?: unknown; page_count?: number | null } | null;
  return NextResponse.json({
    documentId: id,
    name: d.original_filename || d.filename,
    extractionId: e?.id ?? null,
    text: e?.extracted_text ?? "",
    status: e?.status ?? null,
    attempt: e?.attempt ?? null,
    warnings: e?.warnings ?? [],
    structured: e?.structured ?? null,
    pageCount: e?.page_count ?? null,
  });
}
