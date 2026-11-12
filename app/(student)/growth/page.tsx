import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "My Growth" };

export default function GrowthPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sun-500">
          <TrendingUp className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">My Growth</h1>
        </div>
        <p className="font-semibold text-ink-400">
          Watch yourself improve — accuracy, topics mastered, XP and trends.
        </p>
      </header>
      <EmptyState
        title="Your growth story begins now"
        description="As you practice and sit mock exams, this page will chart your progress, highlight weak areas and suggest what to revise next."
      />
    </div>
  );
}
