import type { UserRole } from "@/types/auth";
import { ROLE_DASHBOARD_PATHS } from "@/lib/auth/session";

export function getDefaultRedirect(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role];
}

export function canAccessDashboard(
  role: UserRole,
  pathname: string
): boolean {
  if (role === "superadmin") return true;

  const allowed = ROLE_DASHBOARD_PATHS[role];
  return pathname === allowed || pathname.startsWith(`${allowed}/`);
}
