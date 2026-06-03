import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth/get-session";

const ALLOWED = ["owner", "superadmin"] as const;

export default function OwnerDashboardPage() {
  const session = getSession();
  if (!session || !ALLOWED.includes(session.role as (typeof ALLOWED)[number])) {
    redirect("/");
  }

  return (
    <DashboardShell title="Dashboard Pemilik" user={session}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Pentadbiran Kedai</h2>
        <p className="mt-2 text-slate-600">
          Urus menu, staf, laporan, dan tetapan kedai anda.
        </p>
      </section>
    </DashboardShell>
  );
}
