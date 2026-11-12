import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Robot } from "@/components/mascot/Robot";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="flex w-full max-w-sm flex-col items-center gap-5 p-8">
        <Robot mood="thinking" size={80} />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-lav-500">
            <ShieldCheck className="h-5 w-5" />
            <h1 className="text-xl font-extrabold text-ink-800">Admin sign in</h1>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-400">
            Javoodle staff only. Student progress is private.
          </p>
        </div>
        <AdminLoginForm />
        <Link
          href="/"
          className="text-sm font-bold text-ink-400 underline-offset-2 hover:text-lav-500 hover:underline"
        >
          ← Back to Javoodle
        </Link>
      </Card>
    </main>
  );
}
