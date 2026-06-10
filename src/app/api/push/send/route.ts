import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { target_user_id, target_role, kedai_id, title, body, tag } =
      await req.json();

    if (!kedai_id || !title || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fetch subscriptions — by user_id or by role within kedai
    let query = supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("kedai_id", kedai_id);

    if (target_user_id) {
      query = query.eq("user_id", target_user_id);
    } else if (target_role) {
      query = query.eq("role", target_role);
    }

    const { data: subs, error } = await query;

    if (error) {
      console.error("Fetch subs error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const payload = JSON.stringify({ title, body, tag: tag || "uruspos" });

    const results = await Promise.allSettled(
      subs.map((row: any) =>
        webpush.sendNotification(row.subscription, payload)
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error("Send push exception:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
