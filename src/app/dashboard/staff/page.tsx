import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/lib/auth/get-session";

const ALLOWED = ["staff", "owner", "superadmin"] as const;

export default function StaffDashboardPage() {
  const session = getSession();
  if (!session || !ALLOWED.includes(session.role as (typeof ALLOWED)[number])) {
    redirect("/");
  }

  return (
    <DashboardShell title="Dashboard Kaunter" user={session}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">POS Kaunter</h2>
        <p className="mt-2 text-slate-600">
          Ambil pesanan, terima bayaran, dan cetak resit pelanggan.
        </p>
      </section>
    </DashboardShell>
  );
}
