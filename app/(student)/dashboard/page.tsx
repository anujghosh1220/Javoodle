import { Dashboard } from "@/components/student/Dashboard";
import { getStudentSession } from "@/lib/student/session";
import { getDashboardStats, getRecentStudentActivity } from "@/lib/student/stats";
import { getNextLessonForStudent } from "@/lib/learn/data";
import { evaluateAndUnlock } from "@/lib/achievements/evaluate";
import { levelForXp } from "@/lib/growth/data";
import { getLearningStreak } from "@/lib/progression/streak";

// Reads the session cookie for the personalized greeting + real stats.
export const instant = false;

export default async function DashboardPage() {
  const session = await getStudentSession();
  const studentId = session?.studentId ?? null;
  const [stats, activity, nextLesson, newUnlocks, streak] = await Promise.all([
    getDashboardStats(studentId),
    getRecentStudentActivity(studentId),
    getNextLessonForStudent(studentId),
    studentId ? evaluateAndUnlock(studentId) : Promise.resolve([]),
    getLearningStreak(studentId),
  ]);
  const xp = stats?.xp ?? 0;
  const { level, into, next } = levelForXp(xp);
  return (
    <Dashboard
      name={session?.displayName ?? "Learner"}
      stats={stats}
      activity={activity}
      nextLesson={nextLesson}
      level={level}
      xpInto={into}
      xpForNext={next}
      streak={streak}
      newAchievements={newUnlocks}
    />
  );
}
