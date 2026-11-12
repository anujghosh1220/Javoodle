import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-lav-500">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">Learn</h1>
        </div>
        <p className="font-semibold text-ink-400">
          Bite-sized Java lessons across the ICSE syllabus, in three phases.
        </p>
      </header>
      <EmptyState
        title="Lessons are almost ready"
        description="We're loading the ICSE Computer Applications syllabus into your personal learning path. Check back soon — your first lesson is on its way!"
      />
      <Card className="p-5">
        <h2 className="font-extrabold text-ink-700">Your three-month journey</h2>
        <ol className="mt-3 space-y-2 text-sm font-semibold text-ink-500">
          <li><span className="text-lav-500">Month 1 —</span> Variables, operators, conditions, loops, classes & methods</li>
          <li><span className="text-mint-500">Month 2 —</span> Constructors, overloading, Strings, arrays, searching & sorting</li>
          <li><span className="text-sun-500">Month 3 —</span> Full revision, previous-year papers & timed mocks</li>
        </ol>
      </Card>
    </div>
  );
}
