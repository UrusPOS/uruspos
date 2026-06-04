"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEMO_PASSWORD,
  ROLE_DASHBOARD_PATHS,
  SESSION_COOKIE,
  serializeSession,
  type SessionUser,
} from "@/lib/auth/session";
import type { UserRole } from "@/types/auth";
import type { AppUser } from "@/types/database";

const DEMO_USERNAMES = [
  "superadmin",
  "makjah",
  "ali",
  "pakdin",
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Sila masukkan nama pengguna dan kata laluan.");
      setLoading(false);
      return;
    }


    const { data: user, error: queryError } = await supabase
      .from("users")
      .select("id, kedai_id, nama, username, role, is_active, password")
      .eq("username", trimmedUsername)
      .eq("is_active", true)
      .single<AppUser>();
      console.log("Username:", trimmedUsername);
console.log("User data:", user);
console.log("Query error:", queryError);

if (queryError || !user) {
  setError("Nama pengguna atau kata laluan tidak sah.");
  setLoading(false);
  return;
}

// Check password
const correctPassword = (user as any)?.password || "abc123";
if (password !== correctPassword) {
  setError("Nama pengguna atau kata laluan tidak sah.");
  setLoading(false);
  return;
}

// Check kedai status kalau bukan superadmin
if (user.role !== "superadmin" && user.kedai_id) {
  const { data: kedai } = await supabase
    .from("kedai")
    .select("status, nama")
    .eq("id", user.kedai_id)
    .single() as any;

  if (kedai?.status === "suspended") {
    setError("Akaun kedai anda telah digantung. Sila hubungi UrusPOS.");
    setLoading(false);
    return;
  }
}

    const role = user.role as UserRole;
    console.log("Role:", role);
    console.log("Paths:", ROLE_DASHBOARD_PATHS);
    console.log("RedirectPath:", ROLE_DASHBOARD_PATHS[role]);
    const redirectPath = ROLE_DASHBOARD_PATHS[role];

    if (!redirectPath) {
      setError("Peranan pengguna tidak dikenali. Hubungi pentadbir.");
      setLoading(false);
      return;
    }

    const session: SessionUser = {
      id: user.id,
      kedai_id: user.kedai_id,
      nama: user.nama,
      username: user.username,
      role,
    };

    document.cookie = `${SESSION_COOKIE}=${serializeSession(session)}; path=/; max-age=604800; SameSite=Lax`;

    router.push(redirectPath);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#0a1f14] to-[#14532d] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-white">Urus</span>
            <span className="text-[#22c55e]">POS</span>
          </h1>
          <p className="mt-3 text-sm text-emerald-200/80">
            Urus Bisnes, Senang Cerita
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/40 bg-black/40 p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-emerald-100/90"
              >
                Nama pengguna
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-2.5 text-white placeholder:text-emerald-700 focus:border-[#22c55e] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30"
                placeholder=""
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-emerald-100/90"
              >
                Kata laluan
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-2.5 text-white placeholder:text-emerald-700 focus:border-[#22c55e] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30"
                placeholder=""
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2.5 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#22c55e] px-4 py-3 font-semibold text-white transition hover:bg-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memuatkan..." : "Log Masuk"}
            </button>
          </form>

          
        </div>
      </div>
    </div>
  );
}
