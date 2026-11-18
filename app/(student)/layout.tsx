import { RobotCompanion } from "@/components/mascot/RobotCompanion";
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
      <StudentMain>{children}</StudentMain>
      <RobotCompanion memory={memory} />
    </div>
  );
}
