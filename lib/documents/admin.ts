import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getQuestionStudioDashboardData() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const [docs, docsAwait, extracted, awaiting, approved, rejected, unverified, recentDocs, recentReviews] = await Promise.all([
    admin.from("documents").select("id", { count: "exact", head: true }),
    admin.from("documents").select("id", { count: "exact", head: true }).in("status", ["uploaded", "extracting"]),
    admin.from("questions").select("id", { count: "exact", head: true }),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("question_status", "pending_review"),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("question_status", "approved"),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("question_status", "rejected"),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("answer_status", "unverified"),
    admin.from("documents").select("id,filename,original_filename,status,source_year,source_type,created_at,extraction_error").order("created_at", { ascending: false }).limit(8),
    admin.from("question_review_events").select("id,question_id,action,reason,actor_email,created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    counts: {
      documents: docs.count ?? 0,
      documentsAwaitingExtraction: docsAwait.count ?? 0,
      questionsExtracted: extracted.count ?? 0,
      questionsAwaitingReview: awaiting.count ?? 0,
      questionsApproved: approved.count ?? 0,
      questionsRejected: rejected.count ?? 0,
      answersUnverified: unverified.count ?? 0,
    },
    recentDocuments: recentDocs.data ?? [],
    recentReviews: recentReviews.data ?? [],
  };
}

export async function listDocuments() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("documents")
    .select("id,filename,original_filename,mime,kind,status,source_year,source_type,description,page_count,file_size,created_at,extraction_error,storage_bucket,storage_path")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getDocumentWithExtraction(documentId: string) {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("*").eq("id", documentId).single();
  if (!doc) return null;
  const { data: extractions } = await admin
    .from("document_extractions")
    .select("*")
    .eq("document_id", documentId)
    .order("attempt", { ascending: false });
  return { doc, extractions: extractions ?? [] };
}

export async function getLatestExtractionText(documentId: string) {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("document_extractions")
    .select("id,extracted_text,warnings,status,attempt,structured,page_count")
    .eq("document_id", documentId)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
