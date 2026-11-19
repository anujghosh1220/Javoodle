import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getStudentSession } from "@/lib/student/session";
import { Visualizer } from "@/components/visualizer/Visualizer";

export const metadata: Metadata = { title: "Java Visualizer" };
export const instant = false;

export default async function VisualizerPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  return <Visualizer />;
}
