import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, Zap, Clock } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { missionBySlug, MISSION_CATEGORY_LABELS } from "@/lib/missions/catalogue";
import { getCompletedMissionIds } from "@/app/actions/missions";
import { MissionWorkspace } from "@/components/missions/MissionWorkspace";
import { Chip } from "@/components/ui/Chip";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";

export const metadata: Metadata = { title: "Mission" };
export const instant = false;

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const session = await getStudentSession();
  if (!session) redirect("/");
  const mission = missionBySlug(id);
  if (!mission) notFound();

  const completed = isSupabaseConfigured() && hasServiceRoleKey()
    ? await getCompletedMissionIds(session.studentId!)
    : new Set<string>();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-8">
      <Link href="/missions" className="inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-ink-400 transition-colors hover:text-lav-400">
        <ArrowLeft className="h-4 w-4" /> All missions
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-lav-100 text-lav-400 border-lav-300/40">{MISSION_CATEGORY_LABELS[mission.category]}</Chip>
          <Chip className={mission.difficulty === "easy" ? "bg-cyan-400/10 text-cyan-300 border-cyan-300/40" : mission.difficulty === "medium" ? "bg-violet-400/10 text-violet-300 border-violet-300/40" : "bg-sun-400/10 text-sun-300 border-sun-300/40"}>
            {{ easy: "Beginner", medium: "Intermediate", hard: "Advanced" }[mission.difficulty]}
          </Chip>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-400"><Zap className="h-3.5 w-3.5 text-sun-400" />+{mission.xp} XP</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-400"><Clock className="h-3.5 w-3.5" />~{mission.minutes} min</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-800">{mission.title}</h1>
        <p className="mt-1 text-sm font-bold italic text-lav-400">{mission.story}</p>
      </header>

      <MissionWorkspace mission={mission} alreadyCompleted={completed.has(mission.id)} />
    </div>
  );
}
