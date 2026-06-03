import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultRedirect } from "@/lib/auth/permissions";
import { getProfileRole } from "@/lib/auth/get-profile-role";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = await getProfileRole(supabase, user.id);
        const redirectTo =
          next !== "/" ? next : getDefaultRedirect(role);
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
