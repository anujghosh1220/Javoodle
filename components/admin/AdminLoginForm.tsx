"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { adminLogin, type AdminAuthState } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

const initial: AdminAuthState = {};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-400">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@example.com"
          className="rounded-xl border-2 border-cream-300 bg-white px-4 py-3 font-semibold text-ink-800 placeholder:text-ink-400 focus:border-lav-300 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-400">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="rounded-xl border-2 border-cream-300 bg-white px-4 py-3 font-semibold text-ink-800 placeholder:text-ink-400 focus:border-lav-300 focus:outline-none"
        />
      </label>
      {state.error && (
        <p className="text-sm font-semibold text-red-500" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <LogIn className="h-5 w-5" /> Sign in
          </>
        )}
      </Button>
    </form>
  );
}
