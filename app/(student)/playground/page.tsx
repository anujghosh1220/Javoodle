import type { Metadata } from "next";
import { Code2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sun-500">
          <Code2 className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">Playground</h1>
        </div>
        <p className="font-semibold text-ink-400">
          A safe sandbox to write and run Java. Your code runs in an isolated
          environment — never on the app server.
        </p>
      </header>
      <EmptyState
        title="The code editor is on its way"
        description="We're wiring up a proper Java editor with run, test cases and instant feedback. It lands in an upcoming update."
      />
    </div>
  );
}
