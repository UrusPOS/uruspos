import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "superadmin") {
    redirect("/login");
  }

  return (
    <AppShell title="Platform Admin" role="superadmin">
      {children}
    </AppShell>
  );
}
