import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { UploadForm } from "@/components/admin/UploadForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Upload documents" };
export const instant = false;

export default async function UploadPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold text-ink-800">Upload question papers</h1>
        <p className="font-semibold text-ink-400">
          Original files are stored privately. After upload, run extraction on the
          Documents page, then use the AI prompt to generate importable JSON.
        </p>
      </div>
      <Card className="max-w-2xl p-6">
        <UploadForm />
      </Card>
    </div>
  );
}
