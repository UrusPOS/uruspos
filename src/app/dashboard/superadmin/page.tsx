import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default async function SuperadminDashboardPage() {
  const session = getSession();
  if (!session || session.role !== "superadmin") redirect("/");

  
  const { data: kedaiList } = await supabase
    .from("kedai")
    .select("*")
    .order("created_at", { ascending: false });

  const stats = {
    total: kedaiList?.length || 0,
    active: kedaiList?.filter((k) => k.status === "active").length || 0,
    beta: kedaiList?.filter((k) => k.status === "beta").length || 0,
    suspended: kedaiList?.filter((k) => k.status === "suspended").length || 0,
  };

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      {/* Header */}
      <div className="bg-[#1a0e35] border-b border-purple-900/30 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-xl">Urus<span className="text-purple-400">POS</span></span>
          <span className="ml-3 bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full">SUPERADMIN</span>
        </div>
        <Link href="/auth/logout" className="text-purple-400 text-sm font-semibold hover:text-white">
          Log Keluar
        </Link>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Hero Stats */}
        <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-6">
          <div className="text-purple-200 text-sm font-medium">Jumlah Kedai Aktif</div>
          <div className="text-white text-5xl font-black mt-1">{stats.total}</div>
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
              ✓ {stats.active} Aktif
            </span>
            <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-1 rounded-full">
              ⏳ {stats.beta} Beta
            </span>
            <span className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-1 rounded-full">
              ⊘ {stats.suspended} Suspended
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-white text-xl font-black">RM 3,684</div>
            <div className="text-purple-400 text-xs mt-1">Fee Terkumpul</div>
          </div>
          <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-white text-xl font-black">RM 184K</div>
            <div className="text-purple-400 text-xs mt-1">Jualan Semua Kedai</div>
          </div>
        </div>

        {/* Kedai List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">Senarai Kedai</h2>
          <button className="bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-full">
            + Kedai Baru
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {kedaiList && kedaiList.length > 0 ? (
            kedaiList.map((kedai) => (
              <div key={kedai.id} className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">{kedai.nama}</div>
                    <div className="text-purple-400 text-xs mt-1">ID: {kedai.id.slice(0, 8)}...</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    kedai.status === "active" ? "bg-green-500/20 text-green-300" :
                    kedai.status === "beta" ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-red-500/20 text-red-300"
                  }`}>
                    {kedai.status === "active" ? "Aktif" :
                     kedai.status === "beta" ? "Beta" : "Suspended"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-900/30">
                  <div className="text-center">
                    <div className="text-white text-sm font-black">RM 0</div>
                    <div className="text-purple-400 text-xs">Jualan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-300 text-sm font-black">RM 0</div>
                    <div className="text-purple-400 text-xs">Fee (2%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-300 text-sm font-black">0</div>
                    <div className="text-purple-400 text-xs">Staff</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-purple-400 py-10">
              Tiada kedai lagi. Tambah kedai baru!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}