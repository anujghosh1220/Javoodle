import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Hammer, CheckCircle2, Lock, ArrowRight, Clock } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { PROJECTS } from "@/lib/projects/catalogue";
import { getCompletedMissionIds } from "@/app/actions/missions";
import { missionBySlug } from "@/lib/missions/catalogue";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";

export const metadata: Metadata = { title: "Projects" };
export const instant = false;

export default async function ProjectsPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");

  const completed = isSupabaseConfigured() && hasServiceRoleKey()
    ? await getCompletedMissionIds(session.studentId!)
    : new Set<string>();
  const { MISSIONS } = await import("@/lib/missions/catalogue");
  const doneSlugs = new Set(MISSIONS.filter((m) => completed.has(m.id)).map((m) => m.slug));

  return (
    <Reveal className="mx-auto w-full max-w-5xl gap-8 py-8">
      <RevealItem>
        <PageHeader
          title="Project Universe"
          description="Multi-mission builds. Every milestone is a real coding mission verified by hidden tests — progress here is earned, not claimed."
        />
      </RevealItem>

      <div className="grid gap-5 md:grid-cols-2">
        {PROJECTS.map((p) => {
          const done = p.milestones.filter((m) => doneSlugs.has(m.missionSlug)).length;
          const finished = done === p.milestones.length;
          return (
            <Card key={p.id} className={`flex flex-col gap-4 p-6 ${finished ? "border-mint-300/50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${finished ? "bg-mint-100 text-mint-400" : "bg-lav-100 text-lav-400"}`}>
                    {finished ? <CheckCircle2 className="h-6 w-6" /> : <Hammer className="h-6 w-6" />}
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold text-ink-800">{p.title}</h2>
                    <p className="text-xs font-bold text-ink-400">{p.difficulty} · ~{p.minutes} min</p>
                  </div>
                </div>
                <Chip className={finished ? "bg-mint-100 text-mint-600 border-mint-300/50" : "bg-cream-100 text-ink-400 border-cream-300/50"}>
                  {done}/{p.milestones.length}
                </Chip>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-ink-500">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.concepts.map((c) => <Chip key={c} className="bg-cream-100 text-ink-400 border-cream-300/50">{c}</Chip>)}
              </div>
              <ul className="flex flex-col gap-2">
                {p.milestones.map((m) => {
                  const ok = doneSlugs.has(m.missionSlug);
                  const mission = missionBySlug(m.missionSlug);
                  return (
                    <li key={m.missionSlug}>
                      <Link href={mission ? `/missions/${mission.slug}` : "/missions"}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${ok ? "bg-mint-50 text-mint-600" : "bg-cream-100/60 text-ink-500 hover:bg-lav-50 hover:text-lav-500"}`}>
                        {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                        {m.label}
                        <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-50" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <RevealItem>
        <Card className="flex items-center gap-3 p-5">
          <Clock className="h-5 w-5 text-lav-400" />
          <p className="text-sm font-semibold text-ink-500">
            Projects are built from verified missions — clear a milestone&rsquo;s mission and it checks off automatically. Your finished code lives in each mission workspace.
          </p>
        </Card>
      </RevealItem>
    </Reveal>
  );
}
