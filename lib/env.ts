import { z } from "zod";

/**
 * Environment configuration.
 *
 * Public vars are exposed to the browser by design (Supabase URL + anon key
 * are meant to be public — security comes from RLS, never from hiding them).
 * SUPABASE_SERVICE_ROLE_KEY is server-only and must NEVER be imported into
 * client components or exposed via NEXT_PUBLIC_*.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    if (!parsed.success) {
      // Invalid values are treated as "not configured" rather than crashing,
      // so the app degrades gracefully in dev. Log once, no secrets.
      console.warn(
        "[javoodle] Invalid Supabase env vars — Supabase features disabled."
      );
      cached = {};
    } else {
      cached = parsed.data;
    }
  }
  return cached;
}

/** True when URL + anon key are present (browser-safe features can run). */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * True when the service-role key is available. Required for privileged
 * operations (student session creation, stats, admin writes bypassing RLS
 * after server-side authorization).
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(getEnv().SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseUrl(): string {
  const url = getEnv().NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  return url;
}

export function supabaseAnonKey(): string {
  const key = getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  return key;
}

export function supabaseServiceKey(): string {
  const key = getEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}
