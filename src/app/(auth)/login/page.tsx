import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-semibold text-emerald-700">
            UrusPOS
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Log masuk</h1>
          <p className="mt-1 text-sm text-slate-600">
            Akses sistem mengikut peranan anda
          </p>
        </div>
        {params.error === "auth" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Pengesahan gagal. Sila cuba lagi.
          </p>
        )}
        <LoginForm redirectTo={params.redirectTo} />
      </div>
    </div>
  );
}
