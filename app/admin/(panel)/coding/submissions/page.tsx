import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listCodingSubmissionsAdmin } from "@/lib/coding/data";
import { CodingSubmissionsClient } from "@/components/admin/coding/CodingSubmissionsClient";
import { BackButton } from "@/components/student/BackButton";

export const instant = false;

export const metadata: Metadata = { title: "Coding Submissions" };

export default async function AdminCodingSubmissionsPage() {
  await connection();
  await requireAdmin();
  const submissions = await listCodingSubmissionsAdmin();
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <BackButton href="/admin/coding" label="Back to Coding Lab" />
      <CodingSubmissionsClient submissions={submissions} />
    </div>
  );
}
