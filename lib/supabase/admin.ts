import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "@/lib/env";

/**
 * Privileged Supabase client using the service-role key.
 *
 * SERVER ONLY — bypasses RLS. Every call site MUST perform its own
 * authorization first (validated student session token or verified admin
 * user). Never import this from a client component or expose it through
 * NEXT_PUBLIC_* variables.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
