"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  Code2,
  ClipboardList,
  Sparkles,
  Flame,
  Target,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { Robot } from "@/components/mascot/Robot";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { leaveJavoodle } from "@/app/actions/student";
import type { DashboardStats } from "@/lib/student/stats";

const quickLinks = [
  { href: "/learn", title: "Today's lesson", desc: "Fresh Java concepts, gently explained", icon: BookOpen, tone: "bg-lav-100 text-lav-500" },
  { href: "/practice", title: "Warm-up practice", desc: "MCQs, outputs & theory drills", icon: Brain, tone: "bg-mint-100 text-mint-600" },
  { href: "/playground", title: "Code playground", desc: "Write, run & break Java safely", icon: Code2, tone: "bg-sun-100 text-sun-500" },
  { href: "/exams", title: "Mock exams", desc: "Real ICSE-format 100-mark papers", icon: ClipboardList, tone: "bg-lav-100 text-lav-500" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function Dashboard({
  name,
  stats,
}: {
  name: string;
  stats: DashboardStats;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Hero */}
      <motion.section variants={item} className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Chip tone="mint">
            <Flame className="h-3.5 w-3.5" /> Level 1 · Seedling Coder
          </Chip>
          <h1 className="text-3xl font-extrabold text-ink-800 sm:text-4xl">
            {greeting}, {name}! 👋
          </h1>
          <p className="text-ink-400 font-semibold">
            Your Java adventure starts right here. One small step at a time.
          </p>
        </div>
        <Robot mood="happy" size={96} className="hidden sm:block" />
      </motion.section>

      {/* Stats row */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "XP earned", value: String(stats.xp), icon: Sparkles, tone: "text-lav-500" },
          { label: "Questions solved", value: String(stats.questionsSolved), icon: Target, tone: "text-mint-500" },
          { label: "Lessons done", value: String(stats.lessonsCompleted), icon: BookOpen, tone: "text-sun-500" },
          { label: "Syllabus", value: `${stats.syllabusPercent}%`, icon: TrendingUp, tone: "text-lav-500" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-col gap-1 p-4">
            <s.icon className={`h-5 w-5 ${s.tone}`} />
            <span className="text-2xl font-extrabold text-ink-800">{s.value}</span>
            <span className="text-xs font-bold text-ink-400">{s.label}</span>
          </Card>
        ))}
      </motion.section>

      <motion.section variants={item} className="grid gap-4 lg:grid-cols-3">
        {/* Daily mission */}
        <Card className="flex flex-col gap-3 border-lav-200 bg-gradient-to-br from-lav-50 to-white p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-lav-500" />
            <h2 className="font-extrabold text-ink-700">Daily mission</h2>
          </div>
          <p className="text-sm font-semibold text-ink-500">
            Complete your first lesson to earn 50 XP and meet your robot friend.
          </p>
          <ProgressBar value={stats.syllabusPercent} />
          <Link
            href="/learn"
            className="mt-auto inline-flex w-fit items-center rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-lav-300"
          >
            Start learning
          </Link>
        </Card>

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href} className="group">
              <Card className="flex h-full items-start gap-3 p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-lav-300 group-hover:shadow-lg">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${q.tone}`}>
                  <q.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-extrabold text-ink-700">{q.title}</span>
                  <span className="block text-xs font-semibold text-ink-400">{q.desc}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Recent activity + sign out */}
      <motion.section variants={item} className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmptyState
            title="No activity yet"
            description="Every lesson, quiz and exam you complete will show up here. Your story starts today!"
          />
        </div>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-extrabold text-ink-700">Achievements</h2>
          <p className="text-sm font-semibold text-ink-400">
            Earn badges for consistency, courage and clever code. They&apos;ll sparkle
            here as you grow.
          </p>
          <div className="mt-auto pt-2">
            <form action={leaveJavoodle}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm font-bold text-ink-400 transition-colors hover:text-red-500"
              >
                <LogOut className="h-4 w-4" /> Switch learner
              </button>
            </form>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  );
}
