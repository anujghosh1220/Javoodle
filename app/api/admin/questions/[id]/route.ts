import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getQuestionFull } from "@/lib/questions/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const data = await getQuestionFull(id);
  if (!data.question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}