import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-mint-500">
          <Brain className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">Practice</h1>
        </div>
        <p className="font-semibold text-ink-400">
          Unlimited attempts, hints and instant feedback. No pressure — just progress.
        </p>
      </header>
      <EmptyState
        title="Question bank loading"
        description="MCQs, fill-in-the-blanks, output prediction, error-spotting and theory drills are being prepared. Practice mode rewards effort, not just perfect scores."
      />
    </div>
  );
}
