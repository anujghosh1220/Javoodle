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

  try {
    await createStudentSession(parsed.data);
  } catch {
    return {
      error:
        "Couldn't reach the learning database. Please try again in a moment.",
    };
  }
  redirect("/dashboard");
}

export async function leaveJavoodle(): Promise<void> {
  await clearStudentSession();
  redirect("/");
}
