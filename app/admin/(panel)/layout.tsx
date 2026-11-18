import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";

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
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AdminNav />
      {children}
    </div>
  );
}
