"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, ClipboardList, ArrowRight, LogOut, User, Zap, HelpCircle, FileCheck2, Trophy, History, Clock, BookOpen, PlayCircle, Brain, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { leaveJavoodle } from "@/app/actions/student";
import type { DashboardStats, RecentActivity } from "@/lib/student/stats";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const statCards = [
  { key: "xp", label: "XP earned", icon: Zap, tone: "bg-lav-100 text-lav-400" },
  { key: "questionsSolved", label: "Questions solved", icon: HelpCircle, tone: "bg-mint-100 text-mint-400" },
  { key: "examsTaken", label: "Exams taken", icon: FileCheck2, tone: "bg-sun-100 text-sun-400" },
] as const;

const quickLinks = [
  { href: "/learn", label: "Learn", icon: BookOpen, tone: "bg-lav-100 text-lav-500" },
  { href: "/practice", label: "Practice", icon: Brain, tone: "bg-sun-100 text-sun-500" },
  { href: "/playground", label: "Playground", icon: Code2, tone: "bg-mint-100 text-mint-600" },
  { href: "/growth", label: "Growth", icon: TrendingUp, tone: "bg-lav-100 text-lav-600" },
];

export function Dashboard({ name, stats, activity, nextLesson }: {
  name: string;
  stats: DashboardStats;
  activity: RecentActivity;
  nextLesson: { lessonId: string; title: string; topicName: string } | null;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const hasActivity = activity.lastExam || activity.lastCoding || activity.latestResult || activity.pendingEvals > 0;

  const statValue = (key: (typeof statCards)[number]["key"]) =>
    key === "xp" ? stats.xp : key === "questionsSolved" ? stats.questionsSolved : stats.examsTaken;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8"
    >
      {/* Welcome */}
      <motion.section variants={item} className="flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ rotate: -12, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-lav-100 to-mint-100 shadow-lg"
        >
          <Code2 className="h-8 w-8 text-lav-400" />
        </motion.div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink-800 sm:text-5xl">
            Hey, {name}! 👋
          </h1>
          <p className="mt-2 text-lg font-semibold text-ink-500">
            {greeting} — ready for another little Java adventure?
          </p>
        </div>
      </motion.section>

      {/* Real stats strip — only shown when persistent data exists */}
      {stats.persistent && (
        <motion.section variants={item} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.key} className="flex items-center gap-3 p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-none text-ink-800">
                  <AnimatedNumber value={statValue(s.key)} />
                </p>
                <p className="mt-1 truncate text-xs font-bold text-ink-400">{s.label}</p>
              </div>
            </Card>
          ))}
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lav-100 text-lav-400">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none text-ink-800">
                {stats.averageExamScore !== null ? (
                  <AnimatedNumber value={stats.averageExamScore} suffix="%" />
                ) : (
                  "—"
                )}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-ink-400">Avg exam score</p>
            </div>
          </Card>
        </motion.section>
      )}

      {/* Continue where you left off — real next lesson when available */}
      {nextLesson && (
        <motion.section variants={item}>
          <Link href={`/learn/lesson/${nextLesson.lessonId}`} className="block">
            <Card interactive className="flex flex-wrap items-center gap-4 border-lav-300/50 bg-gradient-to-r from-lav-50 to-cream-100 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lav-100 text-lav-500">
                <PlayCircle className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-widest text-lav-500">Continue where you left off</p>
                <p className="mt-0.5 truncate text-lg font-extrabold text-ink-800">{nextLesson.title}</p>
                <p className="text-sm font-semibold text-ink-400">{nextLesson.topicName}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lav-400 px-4 py-2 text-sm font-extrabold text-white">
                Resume <ArrowRight className="h-4 w-4" />
              </span>
            </Card>
          </Link>
        </motion.section>
      )}

      {/* Quick access to the learning journey */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card interactive className="flex flex-col items-center gap-2 p-4 text-center">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${l.tone}`}>
                <l.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-extrabold text-ink-700">{l.label}</span>
            </Card>
          </Link>
        ))}
      </motion.section>

      {/* Two activity cards */}
      <motion.section variants={item} className="grid w-full gap-5 sm:grid-cols-2">
        <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 250 }}>
          <Link href="/exams" className="block h-full">
            <Card className="flex h-full flex-col items-center gap-3 border-lav-200 bg-gradient-to-br from-lav-50 to-cream-100 p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lav-100">
                <ClipboardList className="h-8 w-8 text-lav-400" />
              </span>
              <h2 className="text-2xl font-extrabold text-ink-800">Exam Zone</h2>
              <p className="text-sm font-semibold text-ink-500">Practice for your ICSE exams and take mock tests.</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-lav-400 px-5 py-2 text-sm font-extrabold text-white">
                Explore Exams <ArrowRight className="h-4 w-4" />
              </span>
            </Card>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 250 }}>
          <Link href="/coding" className="block h-full">
            <Card className="flex h-full flex-col items-center gap-3 border-mint-200 bg-gradient-to-br from-mint-50 to-cream-100 p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-mint-100">
                <Code2 className="h-8 w-8 text-mint-400" />
              </span>
              <h2 className="text-2xl font-extrabold text-ink-800">Coding Lab</h2>
              <p className="text-sm font-semibold text-ink-500">Write Java, solve fun challenges and learn by doing.</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint-500 px-5 py-2 text-sm font-extrabold text-white">
                Start Coding <ArrowRight className="h-4 w-4" />
              </span>
            </Card>
          </Link>
        </motion.div>
      </motion.section>

      {/* Recent activity — real data only */}
      <motion.section variants={item}>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-800">
            <History className="h-5 w-5 text-lav-400" /> Recent activity
          </h2>
          {!hasActivity ? (
            <p className="mt-3 text-sm font-semibold text-ink-400">
              Your adventure is just getting started — pick an activity above and let&apos;s make some Java magic! ✨
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activity.lastExam && (
                <li>
                  <Link href={activity.lastExam.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-ink-600 transition-colors hover:bg-cream-100">
                    <FileCheck2 className="h-4 w-4 text-lav-400" /> Last exam: {activity.lastExam.title}
                  </Link>
                </li>
              )}
              {activity.latestResult && (
                <li>
                  <Link href={activity.latestResult.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-ink-600 transition-colors hover:bg-cream-100">
                    <Trophy className="h-4 w-4 text-sun-400" />
                    Latest result: {activity.latestResult.title}
                    {activity.latestResult.score !== null && ` — ${activity.latestResult.score}/${activity.latestResult.max ?? "?"}`}
                  </Link>
                </li>
              )}
              {activity.pendingEvals > 0 && (
                <li className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-ink-600">
                  <Clock className="h-4 w-4 text-mint-400" /> {activity.pendingEvals} submission{activity.pendingEvals === 1 ? "" : "s"} awaiting evaluation
                </li>
              )}
              {activity.lastCoding && (
                <li>
                  <Link href={activity.lastCoding.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-ink-600 transition-colors hover:bg-cream-100">
                    <Code2 className="h-4 w-4 text-mint-400" /> Latest coding: {activity.lastCoding.title}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>
      </motion.section>

      {/* Footer */}
      <motion.footer variants={item} className="flex flex-col items-center gap-3">
        <p className="text-sm font-bold text-ink-400">One line of code at a time. You&apos;ve got this! 💜</p>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-600 [&::-webkit-details-marker]:hidden">
            <User className="h-3.5 w-3.5" /> Account
          </summary>
          <div className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-2xl border border-cream-300/60 bg-cream-200 p-2 shadow-lg">
            <form action={leaveJavoodle}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
                <LogOut className="h-4 w-4" /> Switch learner
              </button>
            </form>
          </div>
        </details>
      </motion.footer>
    </motion.div>
  );
}
