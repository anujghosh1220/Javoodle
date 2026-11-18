"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { adminLogin, type AdminAuthState } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

const initial: AdminAuthState = {};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div>
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" loading={pending} className="mt-1 w-full">
        <LogIn className="h-4 w-4" /> Sign in
      </Button>
    </form>
  );
}
