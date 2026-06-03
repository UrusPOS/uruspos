import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["owner", "superadmin"] as const;

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || !ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/login");
  }

  return (
    <AppShell title="Pentadbiran Kedai" role={profile.role}>
      {children}
    </AppShell>
  );
}
