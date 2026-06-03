import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth/get-session";

export default function SuperadminDashboardPage() {
  const session = getSession();
  if (!session || session.role !== "superadmin") redirect("/");

  return (
    <DashboardShell title="Dashboard Superadmin" user={session}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Platform Admin</h2>
        <p className="mt-2 text-slate-600">
          Urus semua kedai, pengguna, dan tetapan platform UrusPOS.
        </p>
      </section>
    </DashboardShell>
  );
}
