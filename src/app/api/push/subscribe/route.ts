import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subscription, user_id, kedai_id, role } = await req.json();

    if (!subscription || !user_id || !kedai_id || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Upsert — kalau user dah ada subscription, update je
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id,
          kedai_id,
          role,
          subscription,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Subscribe error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscribe exception:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
