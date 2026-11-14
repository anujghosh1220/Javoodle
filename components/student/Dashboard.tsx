"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, ClipboardList, ArrowRight, LogOut, User } from "lucide-react";
import { Robot } from "@/components/mascot/Robot";
import { Card } from "@/components/ui/Card";
import { leaveJavoodle } from "@/app/actions/student";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function Dashboard({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-8 py-8"
    >
      {/* Welcome */}
      <motion.section variants={item} className="flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ rotate: -12, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Robot mood="happy" size={120} />
        </motion.div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink-800 sm:text-5xl">
            Hey, {name}! 👋
          </h1>
          <p className="mt-2 text-lg font-semibold text-ink-400">
            {greeting} — ready for another little Java adventure?
          </p>
        </div>
      </motion.section>

      {/* Two activity cards */}
      <motion.section variants={item} className="grid w-full gap-4 sm:grid-cols-2">
        <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 250 }}>
          <Link href="/exams" className="block h-full">
            <Card className="flex h-full flex-col items-center gap-3 border-lav-200 bg-gradient-to-br from-lav-50 to-white p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lav-100">
                <ClipboardList className="h-8 w-8 text-lav-500" />
              </span>
              <h2 className="text-2xl font-extrabold text-ink-800">Exam Zone</h2>
              <p className="text-sm font-semibold text-ink-500">Practice for your ICSE exams and take mock tests.</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-lav-400 px-5 py-2 text-sm font-extrabold text-white transition-transform group-hover:gap-2.5">
                Explore Exams <ArrowRight className="h-4 w-4" />
              </span>
            </Card>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 250 }}>
          <Link href="/coding" className="block h-full">
            <Card className="flex h-full flex-col items-center gap-3 border-mint-200 bg-gradient-to-br from-mint-50 to-white p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-mint-100">
                <Code2 className="h-8 w-8 text-mint-600" />
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

      {/* Footer */}
      <motion.footer variants={item} className="flex flex-col items-center gap-3">
        <p className="text-sm font-bold text-ink-400">One line of code at a time. You&apos;ve got this! 💜</p>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-600 [&::-webkit-details-marker]:hidden">
            <User className="h-3.5 w-3.5" /> Account
          </summary>
          <div className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-2xl border border-cream-200 bg-white p-2 shadow-lg">
            <form action={leaveJavoodle}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-500 transition-colors hover:bg-red-50 hover:text-red-500">
                <LogOut className="h-4 w-4" /> Switch learner
              </button>
            </form>
          </div>
        </details>
      </motion.footer>
    </motion.div>
  );
}
