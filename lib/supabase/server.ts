import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Server Supabase client bound to the request's cookie store.
 * Uses the anon key + the caller's auth cookies, so RLS applies with the
 * caller's identity (used for admin auth checks).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie writes belong in
          // Server Actions / Route Handlers. Safe to ignore here.
        }
      },
    },
  });
}
