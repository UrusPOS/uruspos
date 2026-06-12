export const USER_ROLES = [
  "superadmin",
  "owner",
  "staff",
  "waiter",
  "cashier",
  "kitchen",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  outlet_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  owner: "Pemilik Kedai",
  staff: "Kakitangan / Kaunter",
  waiter: "Pelayan",
  cashier: "Juruwang",
  kitchen: "Dapur",
};

export const ROLE_HOME_PATHS: Record<UserRole, string> = {
  superadmin: "/dashboard/superadmin",
  owner: "/dashboard/owner",
  staff: "/dashboard/staff",
  waiter: "/dashboard/staff",
  cashier: "/dashboard/cashier",
  kitchen: "/dashboard/kitchen",
};