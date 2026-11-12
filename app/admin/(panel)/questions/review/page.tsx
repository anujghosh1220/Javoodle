/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getReviewQueue } from "@/lib/questions/admin";
import { listDocuments } from "@/lib/documents/admin";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewWorkspace } from "@/components/questions/ReviewWorkspace";

export const metadata: Metadata = { title: "Review questions" };
export const instant = false;

export default async function ReviewPage() {
  await requireAdmin();
  const [queue, docs] = await Promise.all([getReviewQueue(100), listDocuments()]);
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Review queue</h1>
        <p className="font-semibold text-ink-400">Compare extracted questions against original sources. Approve/reject questions and answers independently.</p>
      </header>
      {queue.length === 0 ? (
        <EmptyState title="No questions awaiting review" description="Import questions from extracted documents to populate the review queue." />
      ) : (
        <ReviewWorkspace initialQueue={queue as any[]} documents={docs as any[]} />
      )}
    </main>
  );
}
