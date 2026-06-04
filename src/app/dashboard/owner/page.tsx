"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type StaffMember = {
  id: string;
  nama: string;
  username: string;
  role: string;
  is_active: boolean;
};

type Produk = {
  id: string;
  nama: string;
  harga_jual: number;
  kos_beli: number;
  stok: number;
  is_active: boolean;
};

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddProduk, setShowAddProduk] = useState(false);
  const [newStaffNama, setNewStaffNama] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");
  const [produkNama, setProdukNama] = useState("");
  const [produkHarga, setProdukHarga] = useState("");
  const [produkKos, setProdukKos] = useState("");
  const [produkStok, setProdukStok] = useState("");
  const [saving, setSaving] = useState(false);
  const [tambahStokId, setTambahStokId] = useState<string | null>(null);
  const [tambahStokNama, setTambahStokNama] = useState("");
  const [tambahStokQty, setTambahStokQty] = useState("");
  const [salesData, setSalesData] = useState({
    harianTotal: 0,
    harianTransaksi: 0,
    bulananTotal: 0,
    bulananCOGS: 0,
    bulananUntung: 0,
    bulananMargin: 0,
    stokKritikal: 0,
  });

  useEffect(() => {
    if (activeTab === "staff") fetchStaff();
    if (activeTab === "inventory") fetchProduk();
    if (activeTab === "dashboard") fetchSalesData();
  }, [activeTab]);

  async function fetchStaff() {
    const { data } = await supabase.from("users").select("*").neq("role", "superadmin").order("created_at", { ascending: false });
    setStaff(data || []);
  }

  async function fetchProduk() {
    const { data } = await supabase.from("produk").select("*").order("created_at", { ascending: false });
    setProduk(data || []);
  }

  async function fetchSalesData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const { data: harianOrders } = await supabase.from("orders").select("total").eq("status", "paid").gte("created_at", todayISO) as any;
    const { data: bulananOrders } = await supabase.from("orders").select("*, order_items(qty, harga, kos)").eq("status", "paid").gte("created_at", firstDay) as any;
    const { data: stokRendah } = await supabase.from("produk").select("id").lte("stok", 5).eq("is_active", true) as any;
    const harianTotal = harianOrders?.reduce((s: number, o: any) => s + Number(o.total), 0) || 0;
    const harianTransaksi = harianOrders?.length || 0;
    const bulananTotal = bulananOrders?.reduce((s: number, o: any) => s + Number(o.total), 0) || 0;
    let bulananCOGS = 0;
    bulananOrders?.forEach((order: any) => { order.order_items?.forEach((item: any) => { bulananCOGS += Number(item.kos) * Number(item.qty); }); });
    const bulananUntung = bulananTotal - bulananCOGS;
    const bulananMargin = bulananTotal > 0 ? Math.round((bulananUntung / bulananTotal) * 100) : 0;
    setSalesData({ harianTotal, harianTransaksi, bulananTotal, bulananCOGS, bulananUntung, bulananMargin, stokKritikal: stokRendah?.length || 0 });
  }

  async function addStaff() {
    if (!newStaffNama.trim() || !newStaffUsername.trim()) return;
    setSaving(true);
    await supabase.from("users").insert({ nama: newStaffNama, username: newStaffUsername.toLowerCase(), role: newStaffRole, is_active: true } as any);
    setNewStaffNama(""); setNewStaffUsername(""); setNewStaffRole("staff"); setShowAddStaff(false); setSaving(false); fetchStaff();
  }

  async function removeStaff(id: string) {
    await supabase.from("users").delete().eq("id", id);
    fetchStaff();
  }

  async function toggleStaff(id: string, current: boolean) {
    await supabase.from("users").update({ is_active: !current } as any).eq("id", id);
    fetchStaff();
  }

  async function addProduk() {
    if (!produkNama.trim()) return;
    setSaving(true);
    await supabase.from("produk").insert({ nama: produkNama, harga_jual: parseFloat(produkHarga) || 0, kos_beli: parseFloat(produkKos) || 0, stok: parseInt(produkStok) || 0 } as any);
    setProdukNama(""); setProdukHarga(""); setProdukKos(""); setProdukStok(""); setShowAddProduk(false); setSaving(false); fetchProduk();
  }

  async function removeProduk(id: string) {
    await supabase.from("produk").delete().eq("id", id);
    fetchProduk();
  }

  async function tambahStok() {
    if (!tambahStokId || !tambahStokQty) return;
    setSaving(true);
    const { data: current } = await supabase.from("produk").select("stok").eq("id", tambahStokId).single() as any;
    const newStok = (current?.stok || 0) + parseInt(tambahStokQty);
    await supabase.from("produk").update({ stok: newStok } as any).eq("id", tambahStokId);
    setTambahStokId(null); setTambahStokNama(""); setTambahStokQty(""); setSaving(false); fetchProduk();
  }

  const margin = produkHarga && produkKos ? Math.round((parseFloat(produkHarga) - parseFloat(produkKos)) / parseFloat(produkHarga) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-gray-900 font-bold text-xl">Urus<span className="text-green-600">POS</span></span>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-gray-900 font-bold text-sm">Mak Jah</div>
            <div className="text-green-600 text-xs font-semibold">👑 Owner</div>
          </div>
          <a href="/auth/logout" className="text-gray-400 text-sm hover:text-gray-600">Log Keluar</a>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div className="mb-4">
              <div className="text-gray-400 text-sm">Selamat datang 👋</div>
              <div className="text-gray-900 text-xl font-black">Kedai Mak Jah</div>
            </div>
            <div className="bg-gradient-to-br from-green-800 to-green-500 rounded-2xl p-6 mb-4">
              <div className="text-green-100 text-sm">Jualan Hari Ini</div>
              <div className="text-white text-4xl font-black mt-1">RM {salesData.harianTotal.toFixed(2)}</div>
              <div className="flex gap-3 mt-3">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">🧾 {salesData.harianTransaksi} transaksi</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">💰</div><div className="text-green-600 text-lg font-black">RM {salesData.bulananUntung.toFixed(0)}</div><div className="text-gray-400 text-xs mt-1">Untung Kasar</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">📊</div><div className="text-gray-900 text-lg font-black">{salesData.bulananMargin}%</div><div className="text-gray-400 text-xs mt-1">Margin</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">⚠️</div><div className="text-amber-500 text-lg font-black">{salesData.stokKritikal} item</div><div className="text-gray-400 text-xs mt-1">Stok Kritikal</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">👥</div><div className="text-gray-900 text-lg font-black">{staff.length} orang</div><div className="text-gray-400 text-xs mt-1">Jumlah Staff</div></div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="text-green-700 text-xs font-bold mb-1">📊 Fee UrusPOS Bulan Ini</div>
              <div className="text-gray-900 text-2xl font-black">RM {(salesData.bulananTotal * 0.02).toFixed(2)}</div>
              <div className="text-gray-400 text-xs mt-1">2% daripada jualan RM {salesData.bulananTotal.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {activeTab === "inventory" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-900 font-bold text-lg">Inventori ({produk.length})</h2>
              <button onClick={() => setShowAddProduk(true)} className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full">+ Tambah Produk</button>
            </div>
            {produk.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                <div className="text-4xl mb-3">📦</div>
                <div className="text-gray-400 text-sm">Belum ada produk lagi</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {produk.map((p) => {
                  const m = p.harga_jual > 0 ? Math.round((p.harga_jual - p.kos_beli) / p.harga_jual * 100) : 0;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-900 font-bold">{p.nama}</div>
                        <div className="flex gap-2">
                          <button onClick={() => { setTambahStokId(p.id); setTambahStokNama(p.nama); setTambahStokQty(""); }} className="text-green-600 text-xs font-bold px-2 py-1 rounded-lg bg-green-50">+ Stok</button>
                          <button onClick={() => removeProduk(p.id)} className="text-red-400 text-xs font-bold px-2 py-1 rounded-lg bg-red-50">🗑</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-gray-50 rounded-xl p-2"><div className="text-gray-900 text-sm font-black">RM {p.harga_jual}</div><div className="text-gray-400 text-xs">Harga Jual</div></div>
                        <div className="text-center bg-gray-50 rounded-xl p-2"><div className="text-gray-900 text-sm font-black">RM {p.kos_beli}</div><div className="text-gray-400 text-xs">Kos Beli</div></div>
                        <div className="text-center bg-gray-50 rounded-xl p-2"><div className={`text-sm font-black ${m >= 40 ? "text-green-600" : "text-amber-500"}`}>{m}%</div><div className="text-gray-400 text-xs">Margin</div></div>
                      </div>
                      <div className="mt-2 text-gray-500 text-xs">Stok: <strong className={p.stok <= 5 ? "text-red-500" : "text-gray-900"}>{p.stok} unit</strong></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LAPORAN */}
        {activeTab === "laporan" && (
          <div>
            <h2 className="text-gray-900 font-bold text-lg mb-4">Laporan</h2>
            <div className="bg-gray-900 rounded-2xl p-5 mb-4 grid grid-cols-2 gap-4">
              <div><div className="text-gray-400 text-xs">Jualan Bulan</div><div className="text-white text-xl font-black mt-1">RM {salesData.bulananTotal.toFixed(2)}</div></div>
              <div><div className="text-gray-400 text-xs">COGS</div><div className="text-red-400 text-xl font-black mt-1">RM {salesData.bulananCOGS.toFixed(2)}</div></div>
              <div><div className="text-gray-400 text-xs">Untung Kasar</div><div className="text-green-400 text-xl font-black mt-1">RM {salesData.bulananUntung.toFixed(2)}</div></div>
              <div><div className="text-gray-400 text-xs">Margin</div><div className="text-green-400 text-xl font-black mt-1">{salesData.bulananMargin}%</div></div>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-gray-400 text-sm">Data akan keluar bila ada jualan</div>
            </div>
          </div>
        )}

        {/* STAFF */}
        {activeTab === "staff" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gray-900 font-bold text-lg">Staff ({staff.length})</h2>
              <button onClick={() => setShowAddStaff(true)} className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full">+ Tambah Staff</button>
            </div>
            <div className="flex flex-col gap-3">
              {staff.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">
                    {s.role === "kitchen" ? "👨‍🍳" : s.role === "manager" ? "👔" : "🧑‍💼"}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 font-bold text-sm">{s.nama}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.role === "kitchen" ? "bg-orange-100 text-orange-600" : s.role === "manager" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                        {s.role === "kitchen" ? "Dapur" : s.role === "manager" ? "Manager" : "Cashier"}
                      </span>
                      <span className="text-gray-300 text-xs">@{s.username}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => toggleStaff(s.id, s.is_active)} className={`text-xs font-bold px-2 py-1.5 rounded-xl border ${s.is_active ? "bg-red-50 text-red-500 border-red-200" : "bg-green-50 text-green-600 border-green-200"}`}>
                      {s.is_active ? "Nyahaktif" : "Aktifkan"}
                    </button>
                    <button onClick={() => removeStaff(s.id)} className="text-xs font-bold px-2 py-1.5 rounded-xl border bg-red-50 text-red-500 border-red-200">🗑 Buang</button>
                  </div>
                </div>
              ))}
              {staff.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <div className="text-4xl mb-3">👥</div>
                  <div className="text-gray-400 text-sm">Belum ada staff</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-4">
        {[
          { id: "dashboard", icon: "🏠", label: "Utama" },
          { id: "inventory", icon: "📦", label: "Inventori" },
          { id: "laporan", icon: "📊", label: "Laporan" },
          { id: "staff", icon: "👥", label: "Staff" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${activeTab === tab.id ? "text-green-600" : "text-gray-400"}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-6">➕ Tambah Staff Baru</h3>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">NAMA PENUH</label>
              <input type="text" value={newStaffNama} onChange={(e) => setNewStaffNama(e.target.value)} placeholder="cth: Ahmad bin Ali" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">USERNAME</label>
              <input type="text" value={newStaffUsername} onChange={(e) => setNewStaffUsername(e.target.value)} placeholder="cth: ahmad123" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">ROLE</label>
              <div className="grid grid-cols-3 gap-2">
                {[{id:"staff",label:"🧑‍💼 Cashier"},{id:"kitchen",label:"👨‍🍳 Dapur"},{id:"manager",label:"👔 Manager"}].map((r) => (
                  <button key={r.id} onClick={() => setNewStaffRole(r.id)} className={`py-3 rounded-xl border text-xs font-bold transition-all ${newStaffRole === r.id ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-400"}`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <div className="text-green-700 text-xs font-bold mb-1">🔑 Credential Staff</div>
              <div className="text-green-600 text-xs">Username: <strong>{newStaffUsername || "..."}</strong></div>
              <div className="text-green-600 text-xs">Password: <strong>abc123</strong> (default)</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddStaff(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={addStaff} disabled={saving || !newStaffNama.trim() || !newStaffUsername.trim()} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Produk Modal */}
      {showAddProduk && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-6">➕ Tambah Produk</h3>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">NAMA PRODUK</label>
              <input type="text" value={produkNama} onChange={(e) => setProdukNama(e.target.value)} placeholder="cth: Nasi Lemak" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-gray-500 text-xs font-bold mb-2 block">HARGA JUAL (RM)</label>
                <input type="number" value={produkHarga} onChange={(e) => setProdukHarga(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-bold mb-2 block">KOS BELI (RM)</label>
                <input type="number" value={produkKos} onChange={(e) => setProdukKos(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">STOK AWAL</label>
              <input type="number" value={produkStok} onChange={(e) => setProdukStok(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            {produkHarga && produkKos && (
              <div className={`rounded-xl p-3 mb-4 ${margin >= 40 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className={`text-xs font-bold ${margin >= 40 ? "text-green-700" : "text-amber-700"}`}>
                  💡 Margin: <strong>{margin}%</strong> {margin >= 40 ? "— Bagus! ✓" : "— Rendah sikit ⚠️"}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowAddProduk(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={addProduk} disabled={saving || !produkNama.trim()} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tambah Stok Modal */}
      {tambahStokId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-2">📦 Tambah Stok</h3>
            <p className="text-gray-400 text-sm mb-6">{tambahStokNama}</p>
            <div className="mb-6">
              <label className="text-gray-500 text-xs font-bold mb-2 block">UNIT NAK DITAMBAH</label>
              <input type="number" value={tambahStokQty} onChange={(e) => setTambahStokQty(e.target.value)} placeholder="cth: 50" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 text-center text-2xl font-black" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTambahStokId(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={tambahStok} disabled={saving || !tambahStokQty} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? "Menyimpan..." : "Tambah"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}