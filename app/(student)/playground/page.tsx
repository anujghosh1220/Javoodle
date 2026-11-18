import type { Metadata } from "next";
import { Code2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { BackButton } from "@/components/student/BackButton";
import { PlaygroundWorkspace } from "@/components/playground/PlaygroundWorkspace";
import { executorConfigured } from "@/lib/coding/executor";

export const metadata: Metadata = { title: "Playground" };
export const instant = false;

export default function PlaygroundPage() {
  const configured = executorConfigured();
  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          icon={Code2}
          title="Playground"
          description="A safe sandbox to write and run Java — experiment freely, break things, learn."
        />
      </RevealItem>
      <RevealItem>
        <BackButton href="/dashboard" label="Back to Dashboard" />
      </RevealItem>
      {!configured && (
        <RevealItem>
          <p className="flex items-center gap-2 rounded-2xl border border-sun-300/60 bg-sun-50 px-4 py-3 text-sm font-bold text-ink-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-sun-500" />
            The Java execution service isn&apos;t configured on this server yet — Run will report it as unavailable. Your teacher needs to add the execution API key.
          </p>
        </RevealItem>
      )}
      <RevealItem>
        <PlaygroundWorkspace />
      </RevealItem>
    </Reveal>
  );
}
