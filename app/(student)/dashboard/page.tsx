import { Dashboard } from "@/components/student/Dashboard";
import { getStudentSession } from "@/lib/student/session";

// Reads the session cookie for the personalized greeting.
export const instant = false;

export default async function DashboardPage() {
  const session = await getStudentSession();
  return <Dashboard name={session?.displayName ?? "Learner"} />;
}
