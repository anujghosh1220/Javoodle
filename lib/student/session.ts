import { cookies, headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashSessionToken,
  isSessionUsable,
  isWellFormedToken,
} from "@/lib/student/token";

export const SESSION_COOKIE = "javoodle_session";
export const NAME_COOKIE = "javoodle_name";
const COOKIE_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000); // 30 days

export interface StudentSession {
  /** Row id in student_sessions (null in cookie-only dev fallback). */
  sessionRowId: string | null;
  /** Persistent student identity (null in fallback mode). */
  studentId: string | null;
  displayName: string;
  /** True when backed by Supabase — progress survives cookie loss. */
  persistent: boolean;
}

function dbEnabled(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

async function setSessionCookies(token: string, displayName: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  // Display name is not a credential — readable for UI, authoritative copy
  // lives in the students table when Supabase is configured.
  store.set(NAME_COOKIE, encodeURIComponent(displayName), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

async function clearCookies() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(NAME_COOKIE);
}

/**
 * Find-or-create the student row for a display name.
 * v1 supports a single student: an exact (case-insensitive) name match reuses
 * the existing profile so progress follows the learner across devices.
 * The name is NEVER used as an authentication credential — the random token
 * is the only credential.
 */
async function findOrCreateStudent(
  admin: SupabaseClient,
  displayName: string
): Promise<string> {
  const { data: existing } = await admin
    .from("students")
    .select("id, display_name")
    .returns<Array<{ id: string; display_name: string }>>();

  const wanted = displayName.trim().toLowerCase();
  const match = existing?.find(
    (s) => s.display_name.trim().toLowerCase() === wanted
  );
  if (match) return match.id;

  const { data, error } = await admin
    .from("students")
    .insert({ display_name: displayName.trim() })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("Could not create student profile");
  }
  return data.id;
}

export async function createStudentSession(
  displayName: string
): Promise<StudentSession> {
  const token = generateSessionToken();

  if (dbEnabled()) {
    const admin = createAdminClient();
    const hdrs = await headers();
    const studentId = await findOrCreateStudent(admin, displayName);

    const { data, error } = await admin
      .from("student_sessions")
      .insert({
        student_id: studentId,
        token_hash: hashSessionToken(token),
        user_agent: hdrs.get("user-agent")?.slice(0, 300) ?? null,
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Could not create learning session");
    }

    await setSessionCookies(token, displayName);
    return {
      sessionRowId: data.id,
      studentId,
      displayName,
      persistent: true,
    };
  }

  // Dev fallback (no Supabase credentials): cookie-only session, progress
  // is not persisted. Production must configure Supabase.
  await setSessionCookies(token, displayName);
  return { sessionRowId: null, studentId: null, displayName, persistent: false };
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  if (dbEnabled()) {
    if (!isWellFormedToken(token)) {
      await clearCookies();
      return null;
    }

    const admin = createAdminClient();
    const tokenHash = hashSessionToken(token);

    const { data } = await admin
      .from("student_sessions")
      .select(
        "id, expires_at, revoked_at, last_seen_at, students(id, display_name)"
      )
      .eq("token_hash", tokenHash)
      .maybeSingle<{
        id: string;
        expires_at: string;
        revoked_at: string | null;
        last_seen_at: string | null;
        students: { id: string; display_name: string };
      }>();

    if (!data) {
      await clearCookies();
      return null;
    }

    const usable = isSessionUsable({
      expiresAt: new Date(data.expires_at),
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
    });
    if (!usable) {
      await clearCookies();
      return null;
    }

    // Throttled last_seen update (at most once per 5 minutes).
    const lastSeen = data.last_seen_at ? new Date(data.last_seen_at) : null;
    if (!lastSeen || Date.now() - lastSeen.getTime() > 5 * 60 * 1000) {
      await admin
        .from("student_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", data.id);
    }

    return {
      sessionRowId: data.id,
      studentId: data.students.id,
      displayName: data.students.display_name,
      persistent: true,
    };
  }

  // Cookie-only fallback.
  const rawName = store.get(NAME_COOKIE)?.value;
  const displayName = rawName ? decodeURIComponent(rawName) : "Learner";
  return { sessionRowId: null, studentId: null, displayName, persistent: false };
}

/** Revoke the DB session row (if any) and clear cookies. */
export async function clearStudentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (dbEnabled() && token && isWellFormedToken(token)) {
    const admin = createAdminClient();
    await admin
      .from("student_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashSessionToken(token));
  }

  await clearCookies();
}
