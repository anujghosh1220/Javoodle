"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client (anon key only).
 * Used for Supabase Auth sign-in/out in client components.
 * All data access still flows through RLS.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
