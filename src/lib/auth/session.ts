import type { UserRole } from "@/types/auth";

export const SESSION_COOKIE = "uruspos_session";

export interface SessionUser {
  id: string;
  kedai_id: string | null;
  nama: string;
  username: string;
  role: UserRole;
}

export function parseSessionCookie(
  value: string | undefined
): SessionUser | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as SessionUser;
  } catch {
    return null;
  }
}

export function serializeSession(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  superadmin: "/dashboard/superadmin",
  owner: "/dashboard/owner",
  staff: "/dashboard/staff",
  kitchen: "/dashboard/kitchen",
};

export const DEMO_PASSWORD = "abc123";
