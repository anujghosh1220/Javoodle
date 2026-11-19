import { LazyRobotCompanion } from "@/components/mascot/LazyRobotCompanion";
import { ExperienceEffects } from "@/components/experience/ExperienceEffects";
import { SoundBridge } from "@/components/atmosphere/SoundBridge";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { StudentNav } from "@/components/student/StudentNav";
import { StudentMain } from "@/components/student/StudentMain";
import { getStudentSession } from "@/lib/student/session";
import { getCompanionMemory } from "@/lib/mascot/memory";

// Reads the student session cookie — cannot be prerendered (Cache Components).
export const instant = false;

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const memory = await getCompanionMemory(session.studentId, session.displayName);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StudentNav />
      <ExperienceEffects />
      <SoundBridge />
      <StudentMain>{children}</StudentMain>
      <LazyRobotCompanion memory={memory} />
    </div>
  );
}
