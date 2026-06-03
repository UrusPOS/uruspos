import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/types/auth";

interface DashboardShellProps {
  title: string;
  user: SessionUser;
  children: ReactNode;
}

export function DashboardShell({ title, user, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <Link href="/" className="text-xs font-semibold text-emerald-700">
              Urus<span className="text-[#22c55e]">POS</span>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-slate-900">{user.nama}</p>
            <p className="text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
