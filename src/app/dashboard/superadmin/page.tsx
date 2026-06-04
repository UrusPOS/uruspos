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
  const [newKedaiOwnerNama, setNewKedaiOwnerNama] = useState("");
  const [newKedaiTelefon, setNewKedaiTelefon] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{username: string, password: string, kedaiNama: string} | null>(null);
  const [activeTab, setActiveTab] = useState("dash");
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [credentialsList, setCredentialsList] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [viewCreds, setViewCreds] = useState<{nama: string, username: string, password: string, kedaiNama: string} | null>(null);

  useEffect(() => { fetchKedai(); }, []);

  async function fetchKedai() {
    const { data } = await supabase.from("kedai").select("*").order("created_at", { ascending: false });
    setKedaiList(data || []);
    if (data && data.length > 0) await fetchAllStats(data);
    setLoading(false);
  }

  async function fetchAllStats(kedais: Kedai[]) {
    const statsMap: { [id: string]: KedaiStats } = {};
    for (const kedai of kedais) {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: orders } = await supabase.from("orders").select("total").in("status", ["paid", "done"]).eq("kedai_id", kedai.id).gte("created_at", firstDay) as any;
      const { data: staffData } = await supabase.from("users").select("id").eq("kedai_id", kedai.id).neq("role", "superadmin") as any;
      const jualan = orders?.reduce((s: number, o: any) => s + Number(o.total), 0) || 0;
      statsMap[kedai.id] = { kedai_id: kedai.id, jualan, fee: jualan * 0.02, staff: staffData?.length || 0 };
    }
    setKedaiStats(statsMap);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("kedai").update({ status } as any).eq("id", id);
    fetchKedai();
  }

  async function deleteKedai(id: string) {
    const { data: orders } = await supabase.from("orders").select("id").eq("kedai_id", id) as any;
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      await supabase.from("order_items").delete().in("order_id", orderIds);
      await supabase.from("orders").delete().eq("kedai_id", id);
    }
    await supabase.from("users").delete().eq("kedai_id", id);
    await supabase.from("produk").delete().eq("kedai_id", id);
    await supabase.from("kedai").delete().eq("id", id);
    setConfirmDelete(null);
    fetchKedai();
  }

  async function addKedai() {
    if (!newKedaiNama.trim() || !newKedaiOwnerNama.trim()) return;
    setSaving(true);
    const username = newKedaiNama.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12) + Math.floor(Math.random() * 100);
    const password = Math.random().toString(36).slice(-8).toUpperCase();
    const { data: kedai } = await supabase.from("kedai").insert({ nama: newKedaiNama, status: newKedaiPlan, tema_warna: "#16a34a" } as any).select().single() as any;
    if (kedai) {
      await supabase.from("users").insert({ nama: newKedaiOwnerNama, username, role: "owner", is_active: true, kedai_id: kedai.id, password } as any);
      setGeneratedCreds({ username, password, kedaiNama: newKedaiNama });
    }
    setNewKedaiNama(""); setNewKedaiOwnerNama(""); setNewKedaiTelefon(""); setNewKedaiPlan("beta");
    setShowAddKedai(false); setSaving(false); fetchKedai();
  }

  async function fetchCredentials(kedaiId: string) {
    setLoadingCreds(true);
    setShowCredentials(kedaiId);
    const { data } = await supabase
      .from("users")
      .select("nama, username, password, role, is_active")
      .eq("kedai_id", kedaiId)
      .order("role") as any;
    setCredentialsList(data || []);
    setLoadingCreds(false);
  }

  async function viewKedaiCreds(kedaiId: string, kedaiNama: string) {
    const { data } = await supabase.from("users").select("nama, username, password").eq("kedai_id", kedaiId).eq("role", "owner").single() as any;
    if (data) setViewCreds({ nama: data.nama, username: data.username, password: data.password || "abc123", kedaiNama });
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
      <div className="bg-[#1a0e35] border-b border-purple-900/30 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-xl">Urus<span className="text-purple-400">POS</span></span>
          <span className="ml-3 bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full">SUPERADMIN</span>
        </div>
        <a href="/auth/logout" className="text-purple-400 text-sm font-semibold hover:text-white">Log Keluar</a>
      </div>

      <div className="bg-[#1a0e35] border-b border-purple-900/20 flex">
        {[
          { id: "dash", label: "📊 Dashboard" },
          { id: "kedai", label: "🏪 Kedai" },
          { id: "billing", label: "💰 Billing" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === tab.id ? "border-purple-400 text-purple-400" : "border-transparent text-stone-500"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {activeTab === "dash" && (
          <div>
            <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-4 mt-4">
              <div className="text-purple-200 text-sm font-medium">Fee Terkumpul Bulan Ini</div>
              <div className="text-white text-4xl font-black mt-1">RM {totalFee.toFixed(2)}</div>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">📊 Jualan RM {totalJualan.toFixed(2)}</span>
                <span className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">✓ {stats.active} Aktif</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30"><div className="text-2xl mb-2">🏪</div><div className="text-white text-xl font-black">{stats.total}</div><div className="text-purple-400 text-xs mt-1">Jumlah Kedai</div></div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30"><div className="text-2xl mb-2">💰</div><div className="text-white text-xl font-black">RM {totalJualan.toFixed(0)}</div><div className="text-purple-400 text-xs mt-1">Jualan Semua Kedai</div></div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30"><div className="text-2xl mb-2">⏳</div><div className="text-yellow-400 text-xl font-black">{stats.beta}</div><div className="text-purple-400 text-xs mt-1">Beta (Free)</div></div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30"><div className="text-2xl mb-2">⊘</div><div className="text-red-400 text-xl font-black">{stats.suspended}</div><div className="text-purple-400 text-xs mt-1">Suspended</div></div>
            </div>
          </div>
        )}

        {activeTab === "kedai" && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-white font-bold text-lg">Senarai Kedai ({kedaiList.length})</div>
              <button onClick={() => setShowAddKedai(true)} className="bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-full">+ Kedai Baru</button>
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
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${kedai.status === "active" ? "bg-green-500/20 text-green-300" : kedai.status === "beta" ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>
                          {kedai.status === "active" ? "Aktif" : kedai.status === "beta" ? "Beta" : "Suspended"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-3 border-t border-purple-900/30 mb-3">
                        <div className="text-center"><div className="text-white text-sm font-black">RM {s?.jualan.toFixed(2) || "0.00"}</div><div className="text-purple-400 text-xs">Jualan</div></div>
                        <div className="text-center"><div className="text-purple-300 text-sm font-black">RM {s?.fee.toFixed(2) || "0.00"}</div><div className="text-purple-400 text-xs">Fee (2%)</div></div>
                        <div className="text-center"><div className="text-green-300 text-sm font-black">{s?.staff || 0}</div><div className="text-purple-400 text-xs">Staff</div></div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {kedai.status !== "active" && <button onClick={() => updateStatus(kedai.id, "active")} className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-2 rounded-xl border border-green-500/30">✓ Aktifkan</button>}
                        {kedai.status !== "beta" && <button onClick={() => updateStatus(kedai.id, "beta")} className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-2 rounded-xl border border-yellow-500/30">⏳ Beta</button>}
                        {kedai.status !== "suspended" && <button onClick={() => updateStatus(kedai.id, "suspended")} className="bg-orange-500/20 text-orange-300 text-xs font-bold px-3 py-2 rounded-xl border border-orange-500/30">⊘ Suspend</button>}
                        <button onClick={() => fetchCredentials(kedai.id)} className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-2 rounded-xl border border-blue-500/30">🔑 Credentials</button>
                        <button onClick={() => setConfirmDelete(kedai.id)} className="bg-red-500/20 text-red-300 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30 ml-auto">🗑 Buang</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                  <div key={kedai.id} className={`bg-[#1a0e35] rounded-2xl p-4 border ${kedai.status === "suspended" ? "border-red-500/30" : kedai.status === "beta" ? "border-yellow-500/20" : "border-green-500/20"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-sm">{kedai.nama}</div>
                        <div className="text-purple-400 text-xs mt-1">{kedai.status === "beta" ? "Beta — Free" : `Jualan RM ${s?.jualan.toFixed(2) || "0.00"}`}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${kedai.status === "suspended" ? "text-red-400" : kedai.status === "beta" ? "text-yellow-400" : "text-green-400"}`}>
                          {kedai.status === "beta" ? "RM 0" : `RM ${s?.fee.toFixed(2) || "0.00"}`}
                        </div>
                        <div className={`text-xs font-bold mt-1 ${kedai.status === "suspended" ? "text-red-400" : kedai.status === "beta" ? "text-yellow-400" : "text-green-400"}`}>
                          {kedai.status === "active" ? "✓ Aktif" : kedai.status === "beta" ? "⏳ Beta" : "⊘ Suspended"}
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

      {/* Confirm Delete */}
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

      {/* Add Kedai */}
      {showAddKedai && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30" style={{maxHeight:'85vh', overflowY:'auto'}}>
            <h3 className="text-white font-bold text-lg mb-6">➕ Tambah Kedai Baru</h3>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">NAMA KEDAI</label>
              <input type="text" value={newKedaiNama} onChange={(e) => setNewKedaiNama(e.target.value)} placeholder="cth: Kedai Makan Pak Ali" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">NAMA OWNER</label>
              <input type="text" value={newKedaiOwnerNama} onChange={(e) => setNewKedaiOwnerNama(e.target.value)} placeholder="cth: Encik Ali bin Ahmad" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">NO TELEFON (OPTIONAL)</label>
              <input type="text" value={newKedaiTelefon} onChange={(e) => setNewKedaiTelefon(e.target.value)} placeholder="cth: 0123456789" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
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
            {newKedaiNama && (
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-3 mb-4">
                <div className="text-purple-400 text-xs font-bold mb-1">PREVIEW CREDENTIALS</div>
                <div className="text-purple-200 text-xs">Username: <strong className="text-white font-mono">{newKedaiNama.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12)}XX</strong></div>
                <div className="text-purple-200 text-xs mt-1">Password: <strong className="text-white">Auto-generated</strong></div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddKedai(false)} className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700">Batal</button>
              <button onClick={addKedai} disabled={saving || !newKedaiNama.trim() || !newKedaiOwnerNama.trim()} className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {saving ? "Menyimpan..." : "Cipta Kedai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Creds */}
      {generatedCreds && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-green-500/30">
            <div className="text-4xl text-center mb-3">🎉</div>
            <h3 className="text-white font-bold text-lg text-center mb-2">Kedai Berjaya Dicipta!</h3>
            <p className="text-purple-400 text-sm text-center mb-6">Hantar credentials ni kepada owner</p>
            <div className="bg-[#0f0a1e] border border-purple-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-purple-900/50"><span className="text-purple-400 text-xs">Nama Kedai</span><span className="text-white text-sm font-bold">{generatedCreds.kedaiNama}</span></div>
              <div className="flex justify-between items-center py-2 border-b border-purple-900/50"><span className="text-purple-400 text-xs">Username</span><span className="text-white text-sm font-mono font-bold">{generatedCreds.username}</span></div>
              <div className="flex justify-between items-center py-2"><span className="text-purple-400 text-xs">Password</span><span className="text-white text-sm font-mono font-bold">{generatedCreds.password}</span></div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
              <div className="text-green-400 text-xs font-bold mb-1">📋 Mesej untuk Owner</div>
              <div className="text-green-300 text-xs leading-relaxed">Selamat datang ke UrusPOS! 🎉{"\n"}Kedai: {generatedCreds.kedaiNama}{"\n"}Username: {generatedCreds.username}{"\n"}Password: {generatedCreds.password}{"\n"}Login: uruspos.vercel.app</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(`Selamat datang ke UrusPOS! 🎉\nKedai: ${generatedCreds.kedaiNama}\nUsername: ${generatedCreds.username}\nPassword: ${generatedCreds.password}\nLogin: uruspos.vercel.app`)} className="w-full bg-purple-700 text-white font-bold py-3 rounded-xl mb-3 text-sm">📋 Copy Mesej WhatsApp</button>
            <button onClick={() => setGeneratedCreds(null)} className="w-full bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700 text-sm">Tutup</button>
          </div>
        </div>
      )}

      {/* View Credentials */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-blue-500/30" style={{maxHeight:'85vh', overflowY:'auto'}}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">🔑 Credentials</h3>
              <button onClick={() => setShowCredentials(null)} className="text-purple-400 text-xl">✕</button>
            </div>
            {loadingCreds ? (
              <div className="text-center text-purple-400 py-6">Loading...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {credentialsList.map((user, i) => (
                  <div key={i} className="bg-[#0f0a1e] border border-purple-900/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-sm font-bold">{user.nama}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${user.role === "owner" ? "bg-purple-500/20 text-purple-300" : user.role === "staff" ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-purple-400 text-xs">Username</span><span className="text-white text-xs font-mono font-bold">{user.username}</span></div>
                      <div className="flex justify-between"><span className="text-purple-400 text-xs">Password</span><span className="text-white text-xs font-mono font-bold">{user.password || "abc123"}</span></div>
                      <div className="flex justify-between"><span className="text-purple-400 text-xs">Status</span><span className={`text-xs font-bold ${user.is_active ? "text-green-400" : "text-red-400"}`}>{user.is_active ? "✓ Aktif" : "✗ Tidak Aktif"}</span></div>
                    </div>
                  </div>
                ))}
                {credentialsList.length === 0 && (
                  <div className="text-center text-purple-400 py-6 text-sm">Tiada user untuk kedai ini.</div>
                )}
              </div>
            )}
            <button onClick={() => setShowCredentials(null)} className="w-full bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700 mt-5 text-sm">Tutup</button>
          </div>
        </div>
      )}

    </div>
  );
}