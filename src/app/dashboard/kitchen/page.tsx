import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth/get-session";

const ALLOWED = ["kitchen", "owner", "superadmin"] as const;

export default function KitchenDashboardPage() {
  const session = getSession();
  if (!session || !ALLOWED.includes(session.role as (typeof ALLOWED)[number])) {
    redirect("/");
  }

  return (
    <DashboardShell title="Dashboard Dapur" user={session}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Kitchen Display</h2>
        <p className="mt-2 text-slate-600">
          Paparan pesanan aktif untuk penyediaan di dapur.
        </p>
      </section>
    </DashboardShell>
  );
}
