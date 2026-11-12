import { redirect } from "next/navigation";
import { StudentNav } from "@/components/student/StudentNav";
import { getStudentSession } from "@/lib/student/session";

// Reads the student session cookie — cannot be prerendered (Cache Components).
export const instant = false;

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StudentNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6">
        {children}
      </main>
    </div>
  );
}
