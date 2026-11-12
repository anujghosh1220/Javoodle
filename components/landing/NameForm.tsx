"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { enterJavoodle, type StudentFormState } from "@/app/actions/student";
import { Button } from "@/components/ui/Button";

const initialState: StudentFormState = {};

export function NameForm() {
  const [state, formAction, pending] = useActionState(enterJavoodle, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="student-name" className="sr-only">
          Your name
        </label>
        <input
          id="student-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={40}
          autoComplete="given-name"
          placeholder="What's your name?"
          className="w-full rounded-full border-2 border-cream-300 bg-white px-6 py-4 text-lg font-semibold text-ink-800 placeholder:text-ink-400 focus:border-lav-300 focus:outline-none"
        />
        <Button type="submit" size="lg" disabled={pending} className="shrink-0">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Let&apos;s go <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
      {state.error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-red-500"
          role="alert"
        >
          {state.error}
        </motion.p>
      )}
      <p className="text-xs text-ink-400">
        No password needed — we&apos;ll remember you on this device.
      </p>
    </form>
  );
}
