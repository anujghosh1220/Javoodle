import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export interface AdminContext {
  user: User;
}

/**
 * Returns the authenticated admin user, or null.
 * Authorization is enforced server-side via Supabase Auth + the
 * app_metadata.role = 'admin' claim — never by hiding UI.
 */
export async function getAdminUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (user.app_metadata?.role !== "admin") return null;
  return user;
}

/** For pages/layouts: redirects to login when not an admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return { user };
}
