import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

// Server-side authorization gate for every admin sub-page.
// The root /admin page performs the same check itself.
export const instant = false;

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  await requireAdmin();
  return <>{children}</>;
}
