import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Brain, Code2, ClipboardList, TrendingUp, ArrowRight, Sparkles, GraduationCap, PenLine, Braces } from "lucide-react";
import { Robot } from "@/components/mascot/Robot";
import { NameForm } from "@/components/landing/NameForm";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getStudentSession } from "@/lib/student/session";

// Reads the session cookie to redirect returning students.
export const instant = false;

const journeys = [
  { href: "/learn", icon: BookOpen, title: "Learn", desc: "Bite-sized Java lessons, gently explained", tone: "bg-lav-100 text-lav-600", ring: "hover:border-lav-300" },
  { href: "/practice", icon: Brain, title: "Practice", desc: "MCQs, output puzzles & theory drills", tone: "bg-sun-100 text-sun-500", ring: "hover:border-sun-300" },
  { href: "/playground", icon: Code2, title: "Playground", desc: "Write & run Java snippets safely", tone: "bg-mint-100 text-mint-600", ring: "hover:border-mint-300" },
  { href: "/growth", icon: TrendingUp, title: "Growth", desc: "Track your streaks & progress", tone: "bg-lav-100 text-lav-600", ring: "hover:border-lav-300" },
];

const activities = [
  { href: "/exams", icon: ClipboardList, title: "Exam Zone", desc: "ICSE-style papers & timed mock tests", tone: "bg-lav-100 text-lav-500", card: "border-lav-200 from-lav-50 to-cream-100" },
  { href: "/coding", icon: PenLine, title: "Coding Lab", desc: "Write Java, run it live, get reviewed", tone: "bg-mint-100 text-mint-600", card: "border-mint-200 from-mint-50 to-cream-100" },
];

const decor = ["{ }", "=>", ";", "int", "class", "public static void", "&&", "String[]", "return", "()"];

export default async function Home() {
  const session = await getStudentSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-6 py-12 sm:px-10 lg:px-16">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lav-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-20 h-80 w-80 rounded-full bg-mint-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-sun-200/50 blur-3xl" />

      <LandingReveal>
        {/* HERO — two columns on desktop */}
        <section className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col items-start gap-5 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="mint">ICSE Class 10 · Computer Applications</Chip>
              <Chip tone="sun">Java edition</Chip>
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight text-ink-800 sm:text-7xl">
              Jav<span className="text-lav-400">oo</span>dl<span className="text-mint-500">e</span>
            </h1>
            <p className="text-3xl font-extrabold leading-tight text-ink-700 sm:text-4xl">
              Little steps. <span className="text-lav-500">Big breakthroughs.</span>
            </p>
            <p className="max-w-lg text-lg font-semibold leading-relaxed text-ink-500 sm:text-xl">
              Learn Java the fun way — bite-sized lessons, playful practice,
              real coding, and full mock exams for your board prep.
            </p>
            <div className="w-full max-w-md pt-2">
              <NameForm />
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            {/* floating Java tokens */}
            {decor.map((t, i) => (
              <span
                key={i}
                className="pointer-events-none absolute font-mono text-sm font-semibold text-lav-300/70"
                style={{
                  top: `${8 + (i * 17) % 80}%`,
                  left: `${(i * 29) % 85}%`,
                  transform: `rotate(${(i % 3) * 8 - 8}deg)`,
                }}
              >
                {t}
              </span>
            ))}
            <div className="relative">
              <Robot mood="happy" size={200} />
              <span className="absolute -right-3 -top-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-500 shadow-sm">
                <Braces className="h-6 w-6" />
              </span>
            </div>
          </div>
        </section>

        {/* JOURNEY CARDS — Learn Java */}
        <section className="w-full space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lav-400 to-mint-400 text-white">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div className="text-left">
              <h2 className="text-2xl font-extrabold text-ink-800">Learn Java your way</h2>
              <p className="text-sm font-semibold text-ink-400">Four ways to grow — pick whatever feels fun today.</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {journeys.map((j) => (
              <Link key={j.href} href={j.href} className="group">
                <Card className={`flex h-full flex-col gap-3 border-2 p-6 text-left transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${j.ring}`}>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${j.tone}`}>
                    <j.icon className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-extrabold text-ink-800">{j.title}</h3>
                  <p className="text-sm font-semibold leading-relaxed text-ink-500">{j.desc}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-extrabold text-ink-600 transition-all group-hover:gap-2 group-hover:text-lav-500">
                    Explore <ArrowRight className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ACTIVITY CARDS */}
        <section className="w-full space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-400 to-lav-400 text-white">
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="text-left">
              <h2 className="text-2xl font-extrabold text-ink-800">Ready to play?</h2>
              <p className="text-sm font-semibold text-ink-400">Jump straight into exams or the coding lab.</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {activities.map((a) => (
              <Link key={a.href} href={a.href} className="group">
                <Card className={`flex h-full flex-col items-center gap-3 border-2 bg-gradient-to-br p-8 text-center transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${a.card}`}>
                  <span className={`flex h-16 w-16 items-center justify-center rounded-3xl ${a.tone}`}>
                    <a.icon className="h-8 w-8" />
                  </span>
                  <h3 className="text-2xl font-extrabold text-ink-800">{a.title}</h3>
                  <p className="max-w-xs text-sm font-semibold leading-relaxed text-ink-500">{a.desc}</p>
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink-800 px-6 py-2.5 text-sm font-extrabold text-white transition-transform group-hover:gap-3">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex w-full flex-col items-center gap-3 pb-4 pt-8 text-center">
          <p className="text-lg font-bold text-ink-600 sm:text-xl">
            Built for one very determined ICSE student. 🐣
          </p>
          <Link href="/admin" className="text-xs font-semibold text-ink-300 underline-offset-2 hover:text-ink-500 hover:underline">
            Admin
          </Link>
        </footer>
      </LandingReveal>
    </main>
  );
}
