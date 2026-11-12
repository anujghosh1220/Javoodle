"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export interface AdminAuthState {
  error?: string;
}

export async function adminLogin(
  _prev: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured yet. Add the environment variables and restart.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }

  // Role is verified again on the admin pages — a valid Supabase user
  // without the admin claim will be bounced back to login.
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
