import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Code2, ClipboardList, Trophy, Brain } from "lucide-react";
import { Robot } from "@/components/mascot/Robot";
import { NameForm } from "@/components/landing/NameForm";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getStudentSession } from "@/lib/student/session";

// Reads the session cookie to redirect returning students.
export const instant = false;

const features = [
  { icon: BookOpen, label: "Learn", tone: "bg-lav-100 text-lav-500" },
  { icon: Brain, label: "Practice", tone: "bg-mint-100 text-mint-600" },
  { icon: Code2, label: "Code", tone: "bg-sun-100 text-sun-500" },
  { icon: ClipboardList, label: "Mock exams", tone: "bg-lav-100 text-lav-500" },
  { icon: Trophy, label: "Grow", tone: "bg-sun-100 text-sun-500" },
];

export default async function Home() {
  const session = await getStudentSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lav-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-20 h-80 w-80 rounded-full bg-mint-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sun-200/50 blur-3xl" />

      <LandingReveal>
        <div className="flex items-end gap-4">
          <Robot mood="happy" size={110} />
          <div className="mb-2 flex flex-col items-start gap-1 text-left">
            <Chip tone="mint">ICSE Class 10 · Computer Applications</Chip>
            <Chip tone="sun">Java edition</Chip>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-extrabold tracking-tight text-ink-800 sm:text-6xl">
            Jav<span className="text-lav-400">oo</span>dl<span className="text-mint-500">e</span>
          </h1>
          <p className="text-xl font-semibold text-ink-500">
            Little steps. <span className="text-lav-500">Big breakthroughs.</span>
          </p>
          <p className="mx-auto max-w-md text-ink-400">
            Learn Java the fun way — bite-sized lessons, playful practice,
            real coding, and full mock exams for your board prep.
          </p>
        </div>

        <Card className="w-full max-w-md p-6">
          <NameForm />
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-full border-2 border-cream-200 bg-white/70 px-4 py-2 text-sm font-bold text-ink-500"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${f.tone}`}>
                <f.icon className="h-4 w-4" />
              </span>
              {f.label}
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-400">
          Built for one very determined ICSE student. 🐣
        </p>
      </LandingReveal>

      <footer className="w-full max-w-3xl pt-8 text-center text-xs text-ink-400">
        <Link href="/admin" className="underline-offset-2 hover:underline">
          Admin
        </Link>
      </footer>
    </main>
  );
}
