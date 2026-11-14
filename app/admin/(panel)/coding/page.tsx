import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listCodingQuestionsAdmin } from "@/lib/coding/data";
import { CodingQuestionsClient } from "@/components/admin/coding/CodingQuestionsClient";

export const instant = false;

export const metadata: Metadata = { title: "Coding Questions" };

export default async function AdminCodingPage() {
  await connection();
  await requireAdmin();
  const questions = await listCodingQuestionsAdmin();
  return <CodingQuestionsClient questions={questions} />;
}
