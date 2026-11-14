import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listCodingSubmissionsAdmin } from "@/lib/coding/data";
import { CodingSubmissionsClient } from "@/components/admin/coding/CodingSubmissionsClient";

export const instant = false;

export const metadata: Metadata = { title: "Coding Submissions" };

export default async function AdminCodingSubmissionsPage() {
  await connection();
  await requireAdmin();
  const submissions = await listCodingSubmissionsAdmin();
  return <CodingSubmissionsClient submissions={submissions} />;
}
