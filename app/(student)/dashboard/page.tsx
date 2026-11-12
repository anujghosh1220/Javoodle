import { Dashboard } from "@/components/student/Dashboard";
import { getStudentSession } from "@/lib/student/session";
import { getDashboardStats } from "@/lib/student/stats";

// Reads the session cookie for the personalized greeting.
export const instant = false;

export default async function DashboardPage() {
  const session = await getStudentSession();
  const stats = await getDashboardStats(session?.studentId ?? null);
  return <Dashboard name={session?.displayName ?? "Learner"} stats={stats} />;
}
