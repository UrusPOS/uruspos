import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/auth/session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const session = parseSessionCookie(
    cookieStore.get(SESSION_COOKIE)?.value
  );

  if (!session) {
    redirect("/");
  }

  return <>{children}</>;
}
