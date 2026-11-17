import { Dashboard } from "@/components/student/Dashboard";
import { getStudentSession } from "@/lib/student/session";
import { getDashboardStats, getRecentStudentActivity } from "@/lib/student/stats";

// Reads the session cookie for the personalized greeting + real stats.
export const instant = false;

export default async function DashboardPage() {
  const session = await getStudentSession();
  const studentId = session?.studentId ?? null;
  const [stats, activity] = await Promise.all([
    getDashboardStats(studentId),
    getRecentStudentActivity(studentId),
  ]);
  return (
    <Dashboard
      name={session?.displayName ?? "Learner"}
      stats={stats}
      activity={activity}
    />
  );
}
