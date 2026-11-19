import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Zap, Clock, Target, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { MISSIONS, MISSION_CATEGORY_LABELS, type Mission } from "@/lib/missions/catalogue";
import { dailyMissionFor, nextDailyMission } from "@/lib/missions/daily";
import { getCompletedMissionIds } from "@/app/actions/missions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Missions" };
export const instant = false;

const DIFF_TIER: Record<Mission["difficulty"], { label: string; cls: string }> = {
  easy: { label: "Beginner", cls: "bg-cyan-400/10 text-cyan-300 border-cyan-300/40" },
  medium: { label: "Intermediate", cls: "bg-violet-400/10 text-violet-300 border-violet-300/40" },
  hard: { label: "Advanced", cls: "bg-sun-400/10 text-sun-300 border-sun-300/40" },
};

export default async function MissionsPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");

  const supabaseReady = isSupabaseConfigured() && hasServiceRoleKey();
  const [completed, missionXp] = await Promise.all([
    supabaseReady ? getCompletedMissionIds(session.studentId!) : Promise.resolve(new Set<string>()),
    (async () => {
      if (!supabaseReady) return 0;
      const admin = createAdminClient();
      const { data } = await admin
        .from("xp_events")
        .select("amount")
        .eq("student_id", session.studentId!)
        .eq("reason", "mission_completed")
        .in("ref_id", MISSIONS.map((m) => m.id));
      return (data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
    })(),
  ]);

  const daily = dailyMissionFor();
  const tomorrow = nextDailyMission();
  const dailyDone = completed.has(daily.id);
  const doneCount = MISSIONS.filter((m) => completed.has(m.id)).length;

  const byCategory = new Map<string, Mission[]>();
  for (const m of MISSIONS) {
    const arr = byCategory.get(m.category) ?? [];
    arr.push(m);
    byCategory.set(m.category, arr);
  }

  return (
    <Reveal className="mx-auto w-full max-w-5xl gap-8 py-8">
      <RevealItem>
        <PageHeader
          title="Coding Missions"
          description="Real Java challenges with hidden test cases. Pass them all to earn XP — verified by the compiler, not by clicks."
        />
      </RevealItem>

      {/* stats strip */}
      <RevealItem className="grid grid-cols-3 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lav-100 text-lav-400"><Target className="h-5 w-5" /></span>
          <div><p className="text-2xl font-extrabold text-ink-800">{doneCount}<span className="text-base text-ink-400">/{MISSIONS.length}</span></p><p className="text-xs font-bold text-ink-400">Missions cleared</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-100 text-sun-400"><Zap className="h-5 w-5" /></span>
          <div><p className="text-2xl font-extrabold text-ink-800">{missionXp}</p><p className="text-xs font-bold text-ink-400">Mission XP earned</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-100 text-mint-400"><Clock className="h-5 w-5" /></span>
          <div><p className="text-2xl font-extrabold text-ink-800">{MISSIONS.filter((m) => !completed.has(m.id)).length}</p><p className="text-xs font-bold text-ink-400">Remaining</p></div>
        </Card>
      </RevealItem>

      {/* daily mission */}
      <RevealItem>
        <Link href={`/missions/${daily.slug}`} className="block">
          <Card interactive className={`relative overflow-hidden border-lav-300/50 bg-gradient-to-r from-lav-50 to-cream-100 p-6 ${dailyDone ? "opacity-80" : ""}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lav-400/10 blur-2xl" />
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lav-100 text-lav-400"><Sparkles className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-lav-500">
                  Daily Mission {dailyDone && <CheckCircle2 className="h-4 w-4 text-mint-400" />}
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold text-ink-800">{daily.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink-500">{daily.briefing}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Chip className={DIFF_TIER[daily.difficulty].cls}>{DIFF_TIER[daily.difficulty].label}</Chip>
                <span className="text-xs font-bold text-ink-400">+{daily.xp} XP · ~{daily.minutes} min</span>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-ink-400">Tomorrow: {tomorrow.title}</p>
          </Card>
        </Link>
      </RevealItem>

      {/* catalogue by category */}
      {[...byCategory.entries()].map(([cat, missions]) => (
        <RevealItem key={cat}>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-400">{MISSION_CATEGORY_LABELS[cat as keyof typeof MISSION_CATEGORY_LABELS]}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {missions.map((m) => {
              const done = completed.has(m.id);
              return (
                <Link key={m.id} href={`/missions/${m.slug}`}>
                  <Card interactive className={`flex h-full flex-col gap-3 p-5 ${done ? "border-mint-300/50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-extrabold text-ink-800">{m.title}</h3>
                      {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-400" /> : <Lock className="h-4 w-4 shrink-0 text-ink-400/50" />}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-ink-500">{m.story}</p>
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Chip className={DIFF_TIER[m.difficulty].cls}>{DIFF_TIER[m.difficulty].label}</Chip>
                      <span className="text-xs font-bold text-ink-400">{m.topic}</span>
                      <span className="ml-auto text-xs font-extrabold text-lav-400">+{m.xp} XP</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </RevealItem>
      ))}
    </Reveal>
  );
}
