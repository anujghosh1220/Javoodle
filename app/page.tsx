import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen, Brain, Code2, ClipboardList, TrendingUp,
  ArrowRight, CheckCircle2, Sparkles, GraduationCap, Braces, Play,
  PenLine, FileCheck2, ChevronRight, Terminal,
} from "lucide-react";
import { Robot } from "@/components/mascot/Robot";
import { NameForm } from "@/components/landing/NameForm";
import { MountReveal, ScrollReveal } from "@/components/landing/Motion";
import { CurrentYear } from "@/components/landing/CurrentYear";
import { getStudentSession } from "@/lib/student/session";

// Reads the session cookie to redirect returning students.
export const instant = false;

const paths = [
  {
    href: "/learn", icon: BookOpen, title: "Learn Java",
    desc: "Bite-sized lessons, explained clearly.",
    accent: "lav",
    chip: "bg-lav-100 text-lav-300 border-lav-300/40",
    iconTone: "bg-gradient-to-br from-lav-500/30 to-lav-300/20 text-lav-300",
    glow: "hover:border-lav-300/60 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.45)]",
    cta: "text-lav-300 group-hover:text-lav-200",
  },
  {
    href: "/practice", icon: Brain, title: "Practice",
    desc: "MCQs, output puzzles and theory drills.",
    accent: "sun",
    chip: "bg-sun-100 text-sun-300 border-sun-300/40",
    iconTone: "bg-gradient-to-br from-sun-500/25 to-sun-300/15 text-sun-300",
    glow: "hover:border-sun-300/60 hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.4)]",
    cta: "text-sun-300 group-hover:text-sun-200",
  },
  {
    href: "/playground", icon: Code2, title: "Playground",
    desc: "Write and run Java snippets safely.",
    accent: "mint",
    chip: "bg-mint-100 text-mint-300 border-mint-300/40",
    iconTone: "bg-gradient-to-br from-mint-500/25 to-mint-300/15 text-mint-300",
    glow: "hover:border-mint-300/60 hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.4)]",
    cta: "text-mint-300 group-hover:text-mint-200",
  },
  {
    href: "/growth", icon: TrendingUp, title: "Growth",
    desc: "See your progress and celebrate improvement.",
    accent: "cyan",
    chip: "bg-[#0e2a33] text-[#22D3EE] border-[#22D3EE]/40",
    iconTone: "bg-gradient-to-br from-[#22D3EE]/25 to-[#22D3EE]/10 text-[#22D3EE]",
    glow: "hover:border-[#22D3EE]/60 hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]",
    cta: "text-[#22D3EE] group-hover:text-[#67E8F9]",
  },
];

const heroCaps = [
  { icon: BookOpen, label: "Learn" },
  { icon: Brain, label: "Practice" },
  { icon: Code2, label: "Code" },
  { icon: ClipboardList, label: "Prepare" },
];

const footerLinks = [
  { href: "/learn", label: "Learn" },
  { href: "/practice", label: "Practice" },
  { href: "/coding", label: "Coding Lab" },
  { href: "/playground", label: "Playground" },
  { href: "/exams", label: "Exams" },
  { href: "/growth", label: "Growth" },
];

export default async function Home() {
  const session = await getStudentSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* ambient lighting */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-lav-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-mint-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full bg-[#22D3EE]/8 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-6 pb-16 pt-14 sm:px-10 lg:gap-28 lg:pt-20">
        {/* ============ SECTION 1 — HERO ============ */}
        <section id="start" className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="flex flex-col items-start gap-6 text-left">
            <MountReveal delay={0.05}>
              <span className="inline-flex items-center gap-2 rounded-full border border-lav-300/30 bg-lav-100/60 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-lav-300">
                <Sparkles className="h-3.5 w-3.5" /> Your Java journey starts here
              </span>
            </MountReveal>

            <MountReveal delay={0.12}>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-ink-800 sm:text-6xl lg:text-7xl">
                Little steps.
                <br />
                <span className="bg-gradient-to-r from-lav-300 via-lav-400 to-mint-300 bg-clip-text text-transparent">
                  Big breakthroughs.
                </span>
              </h1>
            </MountReveal>

            <MountReveal delay={0.2}>
              <p className="max-w-lg text-lg font-semibold leading-relaxed text-ink-500 sm:text-xl">
                Learn Java, practise questions, write real programs and prepare
                for your ICSE exam — all in one place, at your own pace.
              </p>
            </MountReveal>

            <MountReveal delay={0.28} className="w-full max-w-md">
              <NameForm />
            </MountReveal>

            <MountReveal delay={0.36}>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {heroCaps.map((c) => (
                  <li key={c.label} className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-400">
                    <c.icon className="h-3.5 w-3.5 text-lav-300" /> {c.label}
                  </li>
                ))}
              </ul>
            </MountReveal>
          </div>

          {/* Robot hero composition */}
          <MountReveal delay={0.25} className="relative flex items-center justify-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[380px] w-[380px] rounded-full bg-lav-500/15 blur-3xl" />
              <div className="absolute h-[300px] w-[300px] rounded-full bg-mint-400/10 blur-3xl" />
            </div>

            {/* floating: code snippet */}
            <div className="animate-float absolute -left-2 top-6 hidden w-52 -rotate-6 rounded-2xl border border-cream-300/60 bg-cream-100/90 p-3 font-mono text-[11px] leading-relaxed text-ink-500 shadow-xl backdrop-blur-md sm:block lg:-left-8">
              <p className="mb-1 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-ink-400">
                <Braces className="h-3 w-3 text-lav-300" /> Main.java
              </p>
              <p><span className="text-lav-300">public class</span> Main {"{"}</p>
              <p className="pl-3"><span className="text-mint-300">void</span> main() {"{"}</p>
              <p className="pl-6 text-ink-400">System.out.println(<span className="text-sun-300">{`"Hi!"`}</span>);</p>
              <p className="pl-3">{"}"}</p>
              <p>{"}"}</p>
            </div>

            {/* floating: compile success */}
            <div className="animate-float absolute -right-2 top-16 flex items-center gap-2 rounded-2xl border border-mint-300/40 bg-cream-100/90 px-3.5 py-2 shadow-xl backdrop-blur-md" style={{ animationDelay: "1.2s" }}>
              <CheckCircle2 className="h-4 w-4 text-mint-300" />
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-ink-600">Compiled</p>
                <p className="text-[9px] font-bold text-ink-400">in 0.42s</p>
              </div>
            </div>

            {/* floating: XP chip */}
            <div className="animate-float absolute -bottom-2 left-4 flex items-center gap-2 rounded-2xl border border-sun-300/40 bg-cream-100/90 px-3.5 py-2 shadow-xl backdrop-blur-md" style={{ animationDelay: "2.1s" }}>
              <Sparkles className="h-4 w-4 text-sun-300" />
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-ink-600">Lesson complete</p>
                <p className="text-[9px] font-bold text-mint-300">+25 XP</p>
              </div>
            </div>

            {/* floating: syntax tokens */}
            {["int", "class", "()", ";"].map((t, i) => (
              <span
                key={t}
                className="animate-float pointer-events-none absolute hidden font-mono text-sm font-bold text-lav-300/50 sm:block"
                style={{
                  top: `${12 + i * 24}%`,
                  right: `${6 + (i % 2) * 14}%`,
                  animationDelay: `${i * 1.1}s`,
                }}
              >
                {t}
              </span>
            ))}

            <div className="animate-float-slow relative">
              <Robot mood="happy" size={290} />
            </div>
          </MountReveal>
        </section>

        {/* ============ SECTION 2 — LEARNING PATHS ============ */}
        <section className="flex flex-col gap-10">
          <ScrollReveal className="flex flex-col items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lav-500 to-mint-400 text-white">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-800 sm:text-4xl">Learn Java your way</h2>
            <p className="max-w-xl font-semibold text-ink-500">Four ways to grow — pick whatever feels right today.</p>
          </ScrollReveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {paths.map((p, i) => (
              <ScrollReveal key={p.href} delay={i * 0.08} className="h-full">
                <Link href={p.href} className={`group flex h-full flex-col gap-4 rounded-card border border-cream-300/50 bg-cream-100/70 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:bg-cream-200/80 ${p.glow}`}>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${p.chip} ${p.iconTone}`}>
                    <p.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold text-ink-800">{p.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-500">{p.desc}</p>
                  </div>
                  <span className={`mt-auto inline-flex items-center gap-1.5 text-sm font-extrabold transition-all group-hover:gap-2.5 ${p.cta}`}>
                    Explore <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ============ SECTION 3 — CODING LAB SHOWCASE ============ */}
        <section className="flex flex-col gap-10">
          <ScrollReveal className="flex flex-col items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-400 to-lav-500 text-white">
              <Terminal className="h-6 w-6" />
            </span>
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink-800 sm:text-4xl">
              Don&apos;t just learn Java. <span className="text-mint-300">Write it. Run it. Master it.</span>
            </h2>
            <p className="max-w-2xl font-semibold text-ink-500">
              A real Java workspace inside Javoodle — Monaco editor, live execution,
              compiler and runtime feedback, and teacher-reviewed submissions.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="overflow-hidden rounded-card border border-cream-300/60 bg-cream-100/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              {/* window chrome */}
              <div className="flex items-center gap-3 border-b border-cream-300/50 px-5 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400/70" />
                  <span className="h-3 w-3 rounded-full bg-sun-300/70" />
                  <span className="h-3 w-3 rounded-full bg-mint-300/70" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-cream-200 px-3 py-1 font-mono text-xs font-bold text-ink-500">
                  <PenLine className="h-3.5 w-3.5 text-lav-300" /> Main.java
                </div>
                <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-mint-300/40 bg-mint-100/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-mint-300 sm:flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-300" /> Illustrative preview
                </span>
              </div>

              <div className="grid lg:grid-cols-[1.2fr_1fr]">
                {/* code panel */}
                <div className="border-b border-cream-300/40 p-5 font-mono text-[13px] leading-7 lg:border-b-0 lg:border-r">
                  <p><span className="text-lav-300">public class</span> <span className="text-ink-700">Main</span> {"{"}</p>
                  <p className="pl-4"><span className="text-lav-300">public static void</span> <span className="text-mint-300">main</span>(<span className="text-ink-500">String[] args</span>) {"{"}</p>
                  <p className="pl-8"><span className="text-lav-300">int</span> <span className="text-sun-300">sum</span> = <span className="text-mint-300">0</span>;</p>
                  <p className="pl-8"><span className="text-lav-300">for</span> (<span className="text-lav-300">int</span> i = <span className="text-mint-300">1</span>; i &lt;= <span className="text-mint-300">10</span>; i++) {"{"}</p>
                  <p className="pl-12">sum += i;</p>
                  <p className="pl-8">{"}"}</p>
                  <p className="pl-8">System.out.println(<span className="text-sun-300">{`"Sum = "`}</span> + sum);</p>
                  <p className="pl-4">{"}"}</p>
                  <p>{"}"}</p>
                </div>

                {/* console panel */}
                <div className="flex flex-col gap-3 bg-[#0a1120] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-400">Console</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-mint-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Success · 0.38s
                    </span>
                  </div>
                  <pre className="rounded-xl bg-cream-200/60 p-4 font-mono text-xs leading-6 text-ink-500">{"$ javac Main.java\n$ java Main\nSum = 55\n\n✓ All sample tests passed"}</pre>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-300 px-4 py-1.5 text-xs font-extrabold text-ink-900">
                      <Play className="h-3.5 w-3.5" /> Run Code
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-lav-300/50 px-4 py-1.5 text-xs font-extrabold text-lav-300">
                      <FileCheck2 className="h-3.5 w-3.5" /> Submit
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <Link
              href="/coding"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-mint-300 px-7 py-3 text-base font-extrabold text-ink-900 shadow-[0_6px_0_#059669] transition-all hover:bg-mint-200 active:translate-y-1 active:shadow-none"
            >
              Explore Coding Lab <ArrowRight className="h-5 w-5" />
            </Link>
          </ScrollReveal>
        </section>

        {/* ============ SECTION 4 — EXAM PREPARATION ============ */}
        <section className="grid gap-6 md:grid-cols-2">
          <ScrollReveal>
            <Link href="/exams" className="group flex h-full flex-col gap-4 rounded-card border border-lav-300/40 bg-gradient-to-br from-lav-100/50 to-cream-100/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-lav-300/70 hover:shadow-[0_0_40px_-12px_rgba(168,85,247,0.5)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lav-100 text-lav-300">
                <ClipboardList className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-ink-800">Exam Zone</h3>
              <ul className="flex flex-col gap-2 text-sm font-semibold text-ink-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lav-300" /> ICSE-style examinations</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lav-300" /> Timed mock tests</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lav-300" /> Smart question navigation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lav-300" /> Performance review</li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-extrabold text-lav-300 transition-all group-hover:gap-2.5">
                Open Exam Zone <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Link href="/coding" className="group flex h-full flex-col gap-4 rounded-card border border-mint-300/40 bg-gradient-to-br from-mint-100/40 to-cream-100/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-mint-300/70 hover:shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-300">
                <Code2 className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-extrabold text-ink-800">Coding Lab</h3>
              <ul className="flex flex-col gap-2 text-sm font-semibold text-ink-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-mint-300" /> Java programming challenges</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-mint-300" /> Write and run code live</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-mint-300" /> Test and submit solutions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-mint-300" /> Teacher review &amp; feedback</li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-extrabold text-mint-300 transition-all group-hover:gap-2.5">
                Open Coding Lab <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </ScrollReveal>
        </section>

        {/* ============ SECTION 5 — FINAL CTA ============ */}
        <section className="flex flex-col items-center gap-6 rounded-card border border-cream-300/50 bg-gradient-to-b from-lav-100/40 to-cream-100/60 px-8 py-16 text-center">
          <ScrollReveal className="flex flex-col items-center gap-4">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink-800 sm:text-4xl">
              Every expert programmer started with{" "}
              <span className="text-lav-300">one line of code.</span>
            </h2>
            <p className="max-w-xl font-semibold text-ink-500">
              Your next breakthrough could be one lesson, one question, or one
              program away.
            </p>
            <a
              href="#student-name"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-lav-400 px-8 py-3.5 text-lg font-extrabold text-white shadow-[0_6px_0_#6d28d9] transition-all hover:bg-lav-300 hover:shadow-[0_6px_0_#7c3aed,0_0_30px_-6px_rgba(168,85,247,0.6)] active:translate-y-1 active:shadow-none"
            >
              Start Your Java Journey <ArrowRight className="h-5 w-5" />
            </a>
          </ScrollReveal>
        </section>

        {/* ============ SECTION 6 — FOOTER ============ */}
        <footer className="flex flex-col items-center gap-6 border-t border-cream-300/40 pb-4 pt-10 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-ink-800">
              Jav<span className="text-lav-300">oo</span>dl<span className="text-mint-300">e</span>
            </span>
            <p className="max-w-sm text-sm font-semibold text-ink-400">
              A Java learning companion for ICSE Class 10 — lessons, practice,
              coding and exam prep in one place.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-bold text-ink-400 transition-colors hover:text-lav-300">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs font-semibold text-ink-400">
            © <CurrentYear /> Javoodle. Made for learners, everywhere.
          </p>
        </footer>
      </div>
    </main>
  );
}
