import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Mock Exams" };

export default function ExamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-lav-500">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">Mock Exams</h1>
        </div>
        <p className="font-semibold text-ink-400">
          Full-length ICSE-format papers — 100 marks, 2 hours, real exam feel.
        </p>
      </header>
      <EmptyState
        title="No exams published yet"
        description="Mock examinations will appear here once your teacher-parent approves them. When they do: section navigation, question palette, autosave and instant results."
      />
    </div>
  );
}
