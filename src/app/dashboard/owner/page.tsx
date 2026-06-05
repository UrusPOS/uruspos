"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseSessionCookie } from "@/lib/auth/session";

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
  kos_produk: number;
  stok: number;
  is_active: boolean;
};

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddProduk, setShowAddProduk] = useState(false);
  const [confirmDeleteProdukId, setConfirmDeleteProdukId] = useState<string | null>(null);
  const [confirmDeleteProdukNama, setConfirmDeleteProdukNama] = useState("");
  const [newStaffNama, setNewStaffNama] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");
  const [produkNama, setProdukNama] = useState("");
  const [produkHarga, setProdukHarga] = useState("");
  const [produkKos, setProdukKos] = useState("");
  const [produkStok, setProdukStok] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit Produk states
  const [editProdukId, setEditProdukId] = useState<string | null>(null);
  const [editProdukNama, setEditProdukNama] = useState("");
  const [editProdukHarga, setEditProdukHarga] = useState("");
  const [editProdukKos, setEditProdukKos] = useState("");
  const [editStokSemasa, setEditStokSemasa] = useState(0);
  const [editStokMode, setEditStokMode] = useState<"tambah" | "tolak">("tambah");
  const [editStokQty, setEditStokQty] = useState("");
  const [editStokReason, setEditStokReason] = useState("");
  const [editStokError, setEditStokError] = useState("");

  const [staffError, setStaffError] = useState("");
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [kedaiInfo, setKedaiInfo] = useState<{ nama: string; status: string } | null>(null);
  const [salesData, setSalesData] = useState({
    harianTotal: 0,
    harianTransaksi: 0,
    bulananTotal: 0,
    bulananCOGS: 0,
    bulananUntung: 0,
    bulananMargin: 0,
    stokKritikal: 0,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [resetStaffId, setResetStaffId] = useState<string | null>(null);
  const [resetStaffNama, setResetStaffNama] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    fetchSessionAndKedai();
  }, [activeTab]);

  async function fetchSessionAndKedai() {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    const session = parseSessionCookie(sessionValue);
    setSessionUser(session);

    if (session?.kedai_id) {
      // FIX: tambah status dalam select
      const { data } = await supabase.from("kedai").select("nama, status").eq("id", session.kedai_id).single() as any;
      setKedaiInfo(data);
      fetchSalesData(session.kedai_id);
      if (activeTab === "staff" || activeTab === "settings") fetchStaff(session.kedai_id);
      if (activeTab === "inventory") fetchProduk(session.kedai_id);
    } else {
      fetchSalesData(null);
    }
  }

  async function fetchStaff(kedaiId?: string | null) {
    const id = kedaiId || sessionUser?.kedai_id;
    if (!id) return;
    const { data } = await supabase.from("users").select("*").eq("kedai_id", id).neq("role", "superadmin").order("created_at", { ascending: false });
    setStaff(data || []);
  }

  async function fetchProduk(kedaiId?: string | null) {
    const id = kedaiId || sessionUser?.kedai_id;
    if (!id) return;
    const { data } = await supabase.from("produk").select("*").eq("kedai_id", id).eq("is_active", true).order("created_at", { ascending: false });
    setProduk(data || []);
  }

  async function fetchSalesData(kedaiId: string | null) {
    if (!kedaiId) {
      setSalesData({ harianTotal: 0, harianTransaksi: 0, bulananTotal: 0, bulananCOGS: 0, bulananUntung: 0, bulananMargin: 0, stokKritikal: 0 });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const { data: harianOrders } = await supabase.from("orders").select("total").in("status", ["paid", "done"]).eq("kedai_id", kedaiId).gte("created_at", todayISO) as any;
    const { data: bulananOrders } = await supabase.from("orders").select("*, order_items(qty, harga, kos)").in("status", ["paid", "done"]).eq("kedai_id", kedaiId).gte("created_at", firstDay) as any;
    const { data: stokRendah } = await supabase.from("produk").select("id").eq("kedai_id", kedaiId).lte("stok", 5).eq("is_active", true) as any;

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
    setStaffError("");
    const { data: existing } = await supabase.from("users").select("id").eq("username", newStaffUsername.toLowerCase()).single() as any;
    if (existing) {
      setStaffError("Username '" + newStaffUsername + "' dah digunakan. Sila pilih username lain.");
      setSaving(false);
      return;
    }
    await supabase.from("users").insert({ nama: newStaffNama, username: newStaffUsername.toLowerCase(), role: newStaffRole, is_active: true, kedai_id: sessionUser?.kedai_id, password: "abc123" } as any);
    setNewStaffNama(""); setNewStaffUsername(""); setNewStaffRole("staff"); setStaffError("");
    setShowAddStaff(false); setSaving(false);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function removeStaff(id: string) {
    await supabase.from("users").delete().eq("id", id);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function toggleStaff(id: string, current: boolean) {
    await supabase.from("users").update({ is_active: !current } as any).eq("id", id);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function addProduk() {
    if (!produkNama.trim()) return;
    setSaving(true);
    await supabase.from("produk").insert({ nama: produkNama, harga_jual: parseFloat(produkHarga) || 0, kos_produk: parseFloat(produkKos) || 0, stok: parseInt(produkStok) || 0, kedai_id: sessionUser?.kedai_id } as any);
    setProdukNama(""); setProdukHarga(""); setProdukKos(""); setProdukStok("");
    setShowAddProduk(false); setSaving(false);
    fetchProduk(sessionUser?.kedai_id);
  }

  async function removeProduk(id: string) {
    await supabase.from("produk").update({ is_active: false } as any).eq("id", id);
    fetchProduk(sessionUser?.kedai_id);
  }

  function openEditProduk(p: Produk) {
    setEditProdukId(p.id);
    setEditProdukNama(p.nama);
    setEditProdukHarga(p.harga_jual.toString());
    setEditProdukKos(p.kos_produk.toString());
    setEditStokSemasa(p.stok);
    setEditStokMode("tambah");
    setEditStokQty("");
    setEditStokReason("");
    setEditStokError("");
  }

  function closeEditProduk() {
    setEditProdukId(null);
    setEditProdukNama("");
    setEditProdukHarga("");
    setEditProdukKos("");
    setEditStokSemasa(0);
    setEditStokQty("");
    setEditStokReason("");
    setEditStokError("");
  }

  async function submitEditProduk() {
    if (!editProdukId) return;
    setEditStokError("");
    setSaving(true);

    let stokBaru = editStokSemasa;
    if (editStokQty) {
      const qty = parseInt(editStokQty);
      if (isNaN(qty) || qty <= 0) {
        setEditStokError("Jumlah stok tidak sah.");
        setSaving(false);
        return;
      }
      if (!editStokReason.trim()) {
        setEditStokError("Sila isi sebab perubahan stok.");
        setSaving(false);
        return;
      }
      stokBaru = editStokMode === "tambah" ? editStokSemasa + qty : editStokSemasa - qty;
      if (stokBaru < 0) {
        setEditStokError(`Stok tidak mencukupi. Stok semasa: ${editStokSemasa} unit.`);
        setSaving(false);
        return;
      }
    }

    await supabase.from("produk").update({
      nama: editProdukNama,
      harga_jual: parseFloat(editProdukHarga) || 0,
      kos_produk: parseFloat(editProdukKos) || 0,
      stok: stokBaru,
    } as any).eq("id", editProdukId);

    closeEditProduk();
    setSaving(false);
    fetchProduk(sessionUser?.kedai_id);
  }

  async function tukarPassword() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) { setPasswordMsg("❌ Password baru tidak sepadan."); return; }
    if (newPassword.length < 6) { setPasswordMsg("❌ Password kena sekurang-kurangnya 6 aksara."); return; }
    const { data: user } = await supabase.from("users").select("password").eq("username", sessionUser?.username).single() as any;
    if (user?.password !== currentPassword) { setPasswordMsg("❌ Password semasa tidak betul."); return; }
    await supabase.from("users").update({ password: newPassword } as any).eq("username", sessionUser?.username);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMsg("✅ Password berjaya ditukar!");
    setTimeout(() => setPasswordMsg(""), 3000);
  }

  async function resetPasswordStaff() {
    if (!resetStaffId || !newStaffPassword.trim()) return;
    await supabase.from("users").update({ password: newStaffPassword } as any).eq("id", resetStaffId);
    setResetStaffId(null); setNewStaffPassword("");
    setResetMsg("✅ Password staff berjaya direset!");
    setTimeout(() => setResetMsg(""), 3000);
  }

  const marginTambah = produkHarga && produkKos ? Math.round((parseFloat(produkHarga) - parseFloat(produkKos)) / parseFloat(produkHarga) * 100) : 0;
  const marginEdit = editProdukHarga && editProdukKos ? Math.round((parseFloat(editProdukHarga) - parseFloat(editProdukKos)) / parseFloat(editProdukHarga) * 100) : 0;

  const previewStokBaru = editStokQty && !isNaN(parseInt(editStokQty))
    ? editStokMode === "tambah"
      ? editStokSemasa + parseInt(editStokQty)
      : editStokSemasa - parseInt(editStokQty)
    : null;

  const isBeta = kedaiInfo?.status === "beta";

  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Utama", description: "Ringkasan jualan" },
    { id: "inventory", icon: "📦", label: "Inventori", description: "Produk & stok" },
    { id: "laporan", icon: "📊", label: "Laporan", description: "Prestasi kedai" },
    { id: "staff", icon: "👥", label: "Staff", description: "Akaun pekerja" },
    { id: "settings", icon: "⚙️", label: "Tetapan", description: "Password & akses" },
  ];

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  }

  const activeNav = navItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 font-black text-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
              aria-label="Buka menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <span className="text-gray-900 font-black text-xl block leading-none">Urus<span className="text-green-600">POS</span></span>
              <div className="md:hidden text-gray-400 text-xs font-bold mt-1 truncate">{activeNav?.label || "Owner"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden xs:block">
              <div className="text-gray-900 font-bold text-sm leading-tight">{sessionUser?.nama || "Owner"}</div>
              <div className="text-green-600 text-xs font-semibold">👑 Owner</div>
            </div>
            <a href="/auth/logout" className="bg-gray-50 border border-gray-200 text-gray-500 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all">
              Log Keluar
            </a>
          </div>
        </div>
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:block bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="grid grid-cols-5 gap-2">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-black transition-all border ${
                  activeTab === tab.id
                    ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20"
                    : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div className="mb-4">
              <div className="text-gray-400 text-sm">Selamat datang 👋</div>
              <div className="text-gray-900 text-xl font-black">{kedaiInfo?.nama || "Kedai Saya"}</div>
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

            {/* Plan Badge */}
            <div className={`rounded-2xl p-4 mb-3 border flex items-center justify-between ${isBeta ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
              <div>
                <div className={`text-xs font-bold mb-0.5 ${isBeta ? "text-yellow-700" : "text-green-700"}`}>PLAN SEMASA</div>
                <div className={`text-sm font-black ${isBeta ? "text-yellow-800" : "text-green-800"}`}>
                  {isBeta ? "⏳ Beta — Cuba Percuma" : "✅ Aktif — 2% Jualan"}
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isBeta ? "bg-yellow-200 text-yellow-800" : "bg-green-200 text-green-800"}`}>
                {isBeta ? "BETA" : "AKTIF"}
              </span>
            </div>

            {/* Fee UrusPOS */}
            {isBeta ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <div className="text-yellow-700 text-xs font-bold mb-1">📊 Fee UrusPOS Bulan Ini</div>
                <div className="flex items-center gap-3">
                  <div className="text-gray-900 text-2xl font-black">RM 0.00</div>
                  <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">🎉 Free semasa Beta</span>
                </div>
                <div className="text-yellow-600 text-xs mt-1">Jualan bulan ini RM {salesData.bulananTotal.toFixed(2)} — tiada caj semasa beta</div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="text-green-700 text-xs font-bold mb-1">📊 Fee UrusPOS Bulan Ini</div>
                <div className="text-gray-900 text-2xl font-black">RM {(salesData.bulananTotal * 0.02).toFixed(2)}</div>
                <div className="text-gray-400 text-xs mt-1">2% daripada jualan RM {salesData.bulananTotal.toFixed(2)}</div>
              </div>
            )}
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
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm"><div className="text-4xl mb-3">📦</div><div className="text-gray-400 text-sm">Belum ada produk lagi</div></div>
            ) : (
              <div className="flex flex-col gap-3">
                {produk.map((p) => {
                  const m = p.harga_jual > 0 ? Math.round((p.harga_jual - p.kos_produk) / p.harga_jual * 100) : 0;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-gray-900 font-bold">{p.nama}</div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditProduk(p)} className="text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">✏️ Edit</button>
                          <button onClick={() => { setConfirmDeleteProdukId(p.id); setConfirmDeleteProdukNama(p.nama); }} className="text-red-400 text-xs font-bold px-2 py-1 rounded-lg bg-red-50">🗑</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-gray-50 rounded-xl p-2"><div className="text-gray-900 text-sm font-black">RM {p.harga_jual}</div><div className="text-gray-400 text-xs">Harga Jual</div></div>
                        <div className="text-center bg-gray-50 rounded-xl p-2"><div className="text-gray-900 text-sm font-black">RM {p.kos_produk}</div><div className="text-gray-400 text-xs">Kos Produk</div></div>
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
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100"><div className="text-4xl mb-3">👥</div><div className="text-gray-400 text-sm">Belum ada staff</div></div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-gray-900 font-bold text-lg mb-4">⚙️ Tetapan</h2>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
              <h3 className="text-gray-900 font-bold text-sm mb-4">🔐 Tukar Password Saya</h3>
              <div className="mb-3">
                <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD SEMASA</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
              <div className="mb-3">
                <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD BARU</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
              <div className="mb-4">
                <label className="text-gray-500 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
              {passwordMsg && (
                <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsg.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{passwordMsg}</div>
              )}
              <button onClick={tukarPassword} disabled={!currentPassword || !newPassword || !confirmPassword} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                Tukar Password
              </button>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-bold text-sm mb-4">👥 Reset Password Staff</h3>
              {resetMsg && (
                <div className="bg-green-50 text-green-700 text-xs font-bold p-3 rounded-xl mb-4">{resetMsg}</div>
              )}
              <div className="flex flex-col gap-3">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div>
                      <div className="text-gray-900 text-sm font-bold">{s.nama}</div>
                      <div className="text-gray-400 text-xs">@{s.username}</div>
                    </div>
                    <button onClick={() => { setResetStaffId(s.id); setResetStaffNama(s.nama); setNewStaffPassword(""); }} className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-2 rounded-xl border border-amber-200">
                      🔑 Reset
                    </button>
                  </div>
                ))}
                {staff.length === 0 && <div className="text-center text-gray-400 text-sm py-4">Tiada staff lagi</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setShowMobileMenu(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Tutup menu"
          />

          <div className="relative h-full w-[84%] max-w-sm bg-white shadow-2xl p-5 flex flex-col animate-[slideInLeft_0.22s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-gray-900 font-black text-xl leading-none">Urus<span className="text-green-600">POS</span></div>
                <div className="text-green-600 text-xs font-black mt-1 uppercase tracking-wide">Owner Dashboard</div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-500 font-black active:scale-95 transition-all"
                aria-label="Tutup menu"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 mb-5 text-white shadow-lg shadow-green-600/20">
              <div className="text-green-100 text-xs font-bold mb-1">KEDAI</div>
              <div className="font-black text-lg leading-tight truncate">{kedaiInfo?.nama || "Kedai Saya"}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full">👑 Owner</span>
                <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full">{isBeta ? "BETA" : "AKTIF"}</span>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => changeTab(item.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all border ${
                      isActive
                        ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20"
                        : "bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100"
                    }`}
                  >
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isActive ? "bg-white/20" : "bg-white border border-gray-100"}`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-sm">{item.label}</span>
                      <span className={`block text-xs font-semibold mt-0.5 ${isActive ? "text-green-100" : "text-gray-400"}`}>
                        {item.description}
                      </span>
                    </span>
                    {isActive && <span className="font-black">✓</span>}
                  </button>
                );
              })}
            </div>

            <a
              href="/auth/logout"
              className="mt-5 w-full bg-red-50 border border-red-100 text-red-500 font-black text-sm py-4 rounded-2xl text-center"
            >
              Log Keluar
            </a>
          </div>

          <style jsx>{`
            @keyframes slideInLeft {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

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
            {staffError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <div className="text-red-600 text-xs font-bold">⚠️ {staffError}</div>
              </div>
            )}
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
                <label className="text-gray-500 text-xs font-bold mb-2 block">KOS PRODUK (RM)</label>
                <input type="number" value={produkKos} onChange={(e) => setProdukKos(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">STOK AWAL</label>
              <input type="number" value={produkStok} onChange={(e) => setProdukStok(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            {produkHarga && produkKos && (
              <div className={`rounded-xl p-3 mb-4 ${marginTambah >= 40 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className={`text-xs font-bold ${marginTambah >= 40 ? "text-green-700" : "text-amber-700"}`}>
                  💡 Margin: <strong>{marginTambah}%</strong> {marginTambah >= 40 ? "— Bagus! ✓" : "— Rendah sikit ⚠️"}
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

      {/* Edit Produk Modal */}
      {editProdukId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" style={{maxHeight:'90vh', overflowY:'auto'}}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-gray-900 font-bold text-lg">✏️ Edit Produk</h3>
              <button onClick={closeEditProduk} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <div className="text-gray-500 text-xs font-bold mb-3">MAKLUMAT PRODUK</div>
              <div className="mb-3">
                <label className="text-gray-500 text-xs font-bold mb-1 block">NAMA PRODUK</label>
                <input type="text" value={editProdukNama} onChange={(e) => setEditProdukNama(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs font-bold mb-1 block">HARGA JUAL (RM)</label>
                  <input type="number" value={editProdukHarga} onChange={(e) => setEditProdukHarga(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold mb-1 block">KOS PRODUK (RM)</label>
                  <input type="number" value={editProdukKos} onChange={(e) => setEditProdukKos(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" />
                </div>
              </div>
              {editProdukHarga && editProdukKos && (
                <div className={`rounded-xl p-2 mt-3 ${marginEdit >= 40 ? "bg-green-100" : "bg-amber-100"}`}>
                  <div className={`text-xs font-bold ${marginEdit >= 40 ? "text-green-700" : "text-amber-700"}`}>
                    💡 Margin: <strong>{marginEdit}%</strong> {marginEdit >= 40 ? "— Bagus! ✓" : "— Rendah sikit ⚠️"}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <div className="text-gray-500 text-xs font-bold mb-3">KEMASKINI STOK</div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold">STOK SEMASA</span>
                <span className={`text-lg font-black ${editStokSemasa <= 5 ? "text-red-500" : "text-gray-900"}`}>{editStokSemasa} unit</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => { setEditStokMode("tambah"); setEditStokQty(""); setEditStokError(""); }} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${editStokMode === "tambah" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-400"}`}>
                  ➕ Tambah Stok
                </button>
                <button onClick={() => { setEditStokMode("tolak"); setEditStokQty(""); setEditStokError(""); }} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${editStokMode === "tolak" ? "bg-red-50 border-red-400 text-red-600" : "bg-white border-gray-200 text-gray-400"}`}>
                  ➖ Tolak Stok
                </button>
              </div>
              <div className="mb-3">
                <label className="text-gray-500 text-xs font-bold mb-1 block">JUMLAH UNIT <span className="text-gray-400 font-normal">(kosongkan kalau tak nak ubah stok)</span></label>
                <input type="number" value={editStokQty} onChange={(e) => { setEditStokQty(e.target.value); setEditStokError(""); }} placeholder="0" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white text-center text-xl font-black" />
              </div>
              {editStokQty && (
                <>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-bold mb-2 block">SEBAB / REASON</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {(editStokMode === "tambah"
                        ? ["Restock", "Pembelian Baru", "Pindahan", "Lain-lain"]
                        : ["Rosak / Luput", "Hilang", "Guna Sendiri", "Lain-lain"]
                      ).map((r) => (
                        <button key={r} onClick={() => setEditStokReason(r)} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${editStokReason === r ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-400"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={editStokReason} onChange={(e) => setEditStokReason(e.target.value)} placeholder="Atau taip reason sendiri..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" />
                  </div>
                  {previewStokBaru !== null && (
                    <div className={`rounded-xl p-2.5 ${previewStokBaru < 0 ? "bg-red-50 border border-red-200" : previewStokBaru <= 5 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                      <div className={`text-xs font-bold ${previewStokBaru < 0 ? "text-red-600" : previewStokBaru <= 5 ? "text-amber-700" : "text-green-700"}`}>
                        {previewStokBaru < 0
                          ? `⚠️ Stok tidak cukup! Akan jadi ${previewStokBaru} unit.`
                          : previewStokBaru <= 5
                          ? `⚠️ Stok selepas: ${previewStokBaru} unit (kritikal)`
                          : `✓ Stok selepas: ${previewStokBaru} unit`}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {editStokError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <div className="text-red-600 text-xs font-bold">⚠️ {editStokError}</div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeEditProduk} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={submitEditProduk} disabled={saving || !editProdukNama.trim()} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Produk Modal */}
      {confirmDeleteProdukId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-red-100">
            <div className="text-3xl text-center mb-3">🗑️</div>
            <h3 className="text-gray-900 font-bold text-lg text-center mb-1">Buang Produk?</h3>
            <p className="text-gray-400 text-sm text-center mb-1"><strong className="text-gray-700">{confirmDeleteProdukNama}</strong></p>
            <p className="text-gray-400 text-xs text-center mb-6">Produk akan disembunyikan dari POS. Rekod jualan lama tidak terjejas.</p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmDeleteProdukId(null); setConfirmDeleteProdukNama(""); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={() => { removeProduk(confirmDeleteProdukId); setConfirmDeleteProdukId(null); setConfirmDeleteProdukNama(""); }} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl">Ya, Buang</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Staff Modal */}
      {resetStaffId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-2">🔑 Reset Password</h3>
            <p className="text-gray-400 text-sm mb-6">{resetStaffNama}</p>
            <div className="mb-6">
              <label className="text-gray-500 text-xs font-bold mb-2 block">PASSWORD BARU</label>
              <input type="text" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="cth: newpass123" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetStaffId(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={resetPasswordStaff} disabled={!newStaffPassword.trim()} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">Reset</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}