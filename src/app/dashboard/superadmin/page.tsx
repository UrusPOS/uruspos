"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kedai = {
  id: string;
  nama: string;
  status: string;
  tema_warna: string;
  created_at: string;
};

type KedaiStats = {
  kedai_id: string;
  jualan: number;
  fee: number;
  staff: number;
};

export default function SuperadminDashboardPage() {
  const [kedaiList, setKedaiList] = useState<Kedai[]>([]);
  const [kedaiStats, setKedaiStats] = useState<{ [id: string]: KedaiStats }>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddKedai, setShowAddKedai] = useState(false);
  const [newKedaiNama, setNewKedaiNama] = useState("");
  const [newKedaiPlan, setNewKedaiPlan] = useState("beta");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dash");

  useEffect(() => {
    fetchKedai();
  }, []);

  async function fetchKedai() {
    const { data } = await supabase
      .from("kedai")
      .select("*")
      .order("created_at", { ascending: false });
    setKedaiList(data || []);

    // Fetch stats for each kedai
    if (data && data.length > 0) {
      await fetchAllStats(data);
    }
    setLoading(false);
  }

  async function fetchAllStats(kedais: Kedai[]) {
    const statsMap: { [id: string]: KedaiStats } = {};

    for (const kedai of kedais) {
      // Get jualan bulan ini
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "paid")
        .gte("created_at", firstDay) as any;

      // Get staff count
      const { data: staffData } = await supabase
        .from("users")
        .select("id")
        .eq("kedai_id", kedai.id)
        .neq("role", "superadmin") as any;

      const jualan = orders?.reduce((s: number, o: any) => s + Number(o.total), 0) || 0;

      statsMap[kedai.id] = {
        kedai_id: kedai.id,
        jualan,
        fee: jualan * 0.02,
        staff: staffData?.length || 0,
      };
    }

    setKedaiStats(statsMap);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("kedai").update({ status } as any).eq("id", id);
    fetchKedai();
  }

  async function deleteKedai(id: string) {
    await supabase.from("kedai").delete().eq("id", id);
    setConfirmDelete(null);
    fetchKedai();
  }

  async function addKedai() {
    if (!newKedaiNama.trim()) return;
    setSaving(true);
    await supabase.from("kedai").insert({
      nama: newKedaiNama,
      status: newKedaiPlan,
      tema_warna: "#16a34a",
    } as any);
    setNewKedaiNama("");
    setNewKedaiPlan("beta");
    setShowAddKedai(false);
    setSaving(false);
    fetchKedai();
  }

  const totalJualan = Object.values(kedaiStats).reduce((s, k) => s + k.jualan, 0);
  const totalFee = Object.values(kedaiStats).reduce((s, k) => s + k.fee, 0);
  const stats = {
    total: kedaiList.length,
    active: kedaiList.filter((k) => k.status === "active").length,
    beta: kedaiList.filter((k) => k.status === "beta").length,
    suspended: kedaiList.filter((k) => k.status === "suspended").length,
  };

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      {/* Header */}
      <div className="bg-[#1a0e35] border-b border-purple-900/30 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-xl">Urus<span className="text-purple-400">POS</span></span>
          <span className="ml-3 bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full">SUPERADMIN</span>
        </div>
        <a href="/auth/logout" className="text-purple-400 text-sm font-semibold hover:text-white">Log Keluar</a>
      </div>

      {/* Nav Tabs */}
      <div className="bg-[#1a0e35] border-b border-purple-900/20 flex">
        {[
          { id: "dash", label: "📊 Dashboard" },
          { id: "kedai", label: "🏪 Kedai" },
          { id: "billing", label: "💰 Billing" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-purple-400 text-purple-400"
                : "border-transparent text-stone-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* DASHBOARD TAB */}
        {activeTab === "dash" && (
          <div>
            {/* Hero */}
            <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-4 mt-4">
              <div className="text-purple-200 text-sm font-medium">Fee Terkumpul Bulan Ini</div>
              <div className="text-white text-4xl font-black mt-1">RM {totalFee.toFixed(2)}</div>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  📊 Jualan RM {totalJualan.toFixed(2)}
                </span>
                <span className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
                  ✓ {stats.active} Aktif
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">🏪</div>
                <div className="text-white text-xl font-black">{stats.total}</div>
                <div className="text-purple-400 text-xs mt-1">Jumlah Kedai</div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-white text-xl font-black">RM {totalJualan.toFixed(0)}</div>
                <div className="text-purple-400 text-xs mt-1">Jualan Semua Kedai</div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-yellow-400 text-xl font-black">{stats.beta}</div>
                <div className="text-purple-400 text-xs mt-1">Beta (Free)</div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">⊘</div>
                <div className="text-red-400 text-xl font-black">{stats.suspended}</div>
                <div className="text-purple-400 text-xs mt-1">Suspended</div>
              </div>
            </div>
          </div>
        )}

        {/* KEDAI TAB */}
        {activeTab === "kedai" && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-white font-bold text-lg">Senarai Kedai ({kedaiList.length})</div>
              <button onClick={() => setShowAddKedai(true)} className="bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-full">
                + Kedai Baru
              </button>
            </div>

            {loading ? (
              <div className="text-center text-purple-400 py-10">Loading...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {kedaiList.map((kedai) => {
                  const s = kedaiStats[kedai.id];
                  return (
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
                          {kedai.status === "active" ? "Aktif" : kedai.status === "beta" ? "Beta" : "Suspended"}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-t border-purple-900/30 mb-3">
                        <div className="text-center">
                          <div className="text-white text-sm font-black">RM {s?.jualan.toFixed(0) || "0"}</div>
                          <div className="text-purple-400 text-xs">Jualan</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-300 text-sm font-black">RM {s?.fee.toFixed(0) || "0"}</div>
                          <div className="text-purple-400 text-xs">Fee (2%)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-300 text-sm font-black">{s?.staff || 0}</div>
                          <div className="text-purple-400 text-xs">Staff</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {kedai.status !== "active" && (
                          <button onClick={() => updateStatus(kedai.id, "active")} className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-2 rounded-xl border border-green-500/30">
                            ✓ Aktifkan
                          </button>
                        )}
                        {kedai.status !== "beta" && (
                          <button onClick={() => updateStatus(kedai.id, "beta")} className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-2 rounded-xl border border-yellow-500/30">
                            ⏳ Beta
                          </button>
                        )}
                        {kedai.status !== "suspended" && (
                          <button onClick={() => updateStatus(kedai.id, "suspended")} className="bg-orange-500/20 text-orange-300 text-xs font-bold px-3 py-2 rounded-xl border border-orange-500/30">
                            ⊘ Suspend
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(kedai.id)} className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30 ml-auto">
                          🗑 Buang
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === "billing" && (
          <div className="mt-4">
            <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-4">
              <div className="text-purple-200 text-sm">Fee Terkumpul Bulan Ini</div>
              <div className="text-white text-3xl font-black mt-1">RM {totalFee.toFixed(2)}</div>
              <div className="text-purple-200 text-xs mt-2">Daripada {stats.active} kedai berbayar</div>
            </div>

            <div className="flex flex-col gap-3">
              {kedaiList.map((kedai) => {
                const s = kedaiStats[kedai.id];
                return (
                  <div key={kedai.id} className={`bg-[#1a0e35] rounded-2xl p-4 border ${
                    kedai.status === "suspended" ? "border-red-500/30" :
                    kedai.status === "beta" ? "border-yellow-500/20" :
                    "border-green-500/20"
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-sm">{kedai.nama}</div>
                        <div className="text-purple-400 text-xs mt-1">
                          {kedai.status === "beta" ? "Beta — Free" : `Jualan RM ${s?.jualan.toFixed(2) || "0"}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${
                          kedai.status === "suspended" ? "text-red-400" :
                          kedai.status === "beta" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {kedai.status === "beta" ? "RM 0" : `RM ${s?.fee.toFixed(2) || "0"}`}
                        </div>
                        <div className={`text-xs font-bold mt-1 ${
                          kedai.status === "suspended" ? "text-red-400" :
                          kedai.status === "beta" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {kedai.status === "active" ? "✓ Aktif" :
                           kedai.status === "beta" ? "⏳ Beta" : "⊘ Suspended"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-red-500/30">
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h3 className="text-white font-bold text-lg text-center mb-2">Buang Kedai?</h3>
            <p className="text-purple-400 text-sm text-center mb-6">Tindakan ini tidak boleh dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700">Batal</button>
              <button onClick={() => deleteKedai(confirmDelete)} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl">Ya, Buang</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Kedai Modal */}
      {showAddKedai && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30">
            <h3 className="text-white font-bold text-lg mb-6">➕ Tambah Kedai Baru</h3>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">NAMA KEDAI</label>
              <input type="text" value={newKedaiNama} onChange={(e) => setNewKedaiNama(e.target.value)} placeholder="cth: Kedai Makan Pak Ali" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            <div className="mb-6">
              <label className="text-purple-400 text-xs font-bold mb-2 block">PLAN</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setNewKedaiPlan("beta")} className={`py-3 rounded-xl border text-sm font-bold transition-all ${newKedaiPlan === "beta" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" : "bg-transparent border-purple-700 text-purple-400"}`}>
                  ⏳ Beta<div className="text-xs font-normal mt-1">Free 2 bulan</div>
                </button>
                <button onClick={() => setNewKedaiPlan("active")} className={`py-3 rounded-xl border text-sm font-bold transition-all ${newKedaiPlan === "active" ? "bg-green-500/20 border-green-500 text-green-300" : "bg-transparent border-purple-700 text-purple-400"}`}>
                  ✓ Aktif<div className="text-xs font-normal mt-1">2% jualan</div>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddKedai(false)} className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700">Batal</button>
              <button onClick={addKedai} disabled={saving || !newKedaiNama.trim()} className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}