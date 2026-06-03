import type { ReactNode } from "react";
import type { UserRole } from "@/types/auth";
import { ROLE_LABELS } from "@/types/auth";

interface AppShellProps {
  title: string;
  role: UserRole;
  children: ReactNode;
}

export function AppShell({ title, role, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              UrusPOS
            </p>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            {ROLE_LABELS[role]}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
