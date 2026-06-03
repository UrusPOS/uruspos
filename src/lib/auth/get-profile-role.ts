import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { UserRole } from "@/types/auth";

export async function getProfileRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserRole> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single<{ role: UserRole }>();

  return data?.role ?? "staff";
}
