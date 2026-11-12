"use server";

import { redirect } from "next/navigation";
import { studentNameSchema } from "@/lib/validation/student";
import {
  createStudentSession,
  clearStudentSession,
} from "@/lib/student/session";

export interface StudentFormState {
  error?: string;
}

export async function enterJavoodle(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const parsed = studentNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your name." };
  }

  await createStudentSession(parsed.data);
  redirect("/dashboard");
}

export async function leaveJavoodle(): Promise<void> {
  await clearStudentSession();
  redirect("/");
}
