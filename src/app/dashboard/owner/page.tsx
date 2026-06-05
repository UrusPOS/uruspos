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

type ReportTopProduct = {
  nama: string;
  qty: number;
  total: number;
};

type InventoryReportItem = {
  id: string;
  nama: string;
  stok: number;
  status: "Habis" | "Rendah" | "Cukup";
};

type PaymentSummaryItem = {
  method: string;
  total: number;
  count: number;
};

type ReceiptItem = {
  id?: string;
  nama: string;
  qty: number;
  harga: number;
  kos?: number;
  nota?: string | null;
};

type RecentReceipt = {
  id: string;
  created_at: string;
  meja: string | null;
  status: string;
  total: number;
  payment_method?: string | null;
  order_items: ReceiptItem[];
};

type OwnerReportData = {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  dineInOrders: number;
  takeawayOrders: number;
  grossProfit: number;
  cogs: number;
  margin: number;
  topProducts: ReportTopProduct[];
  inventoryReport: InventoryReportItem[];
  paymentSummary: PaymentSummaryItem[];
  recentReceipts: RecentReceipt[];
};

type FilterType = "daily" | "weekly" | "monthly" | "custom";

function getDateRange(filter: FilterType, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (filter === "daily") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    const toCustom = new Date(customTo);
    toCustom.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: toCustom.toISOString() };
  }
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getCookieSession() {
  try {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((c) => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    if (!sessionValue) return null;
    const parsedSession = parseSessionCookie(sessionValue);
    if (parsedSession) return parsedSession;
    return JSON.parse(decodeURIComponent(sessionValue));
  } catch {
    return null;
  }
}

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
  const [kedaiInfo, setKedaiInfo] = useState<{ nama: string; status: string; table_count?: number | null } | null>(null);

  // UNIFIED stats — satu je state, ikut filter
  const [stats, setStats] = useState({
    jumlahJualan: 0,
    jumlahTransaksi: 0,
    jumlahCOGS: 0,
    jumlahUntung: 0,
    jumlahMargin: 0,
    stokKritikal: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const [reportData, setReportData] = useState<OwnerReportData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    dineInOrders: 0,
    takeawayOrders: 0,
    grossProfit: 0,
    cogs: 0,
    margin: 0,
    topProducts: [],
    inventoryReport: [],
    paymentSummary: [],
    recentReceipts: [],
  });
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RecentReceipt | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [resetStaffId, setResetStaffId] = useState<string | null>(null);
  const [resetStaffNama, setResetStaffNama] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [tableCountInput, setTableCountInput] = useState(6);
  const [tableMsg, setTableMsg] = useState("");

  // Filter states — shared across dashboard & laporan
  const [filter, setFilter] = useState<FilterType>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<FilterType>("daily");
  const [pendingCustomFrom, setPendingCustomFrom] = useState("");
  const [pendingCustomTo, setPendingCustomTo] = useState("");

  useEffect(() => {
    fetchSessionAndKedai();
  }, [activeTab, filter, customFrom, customTo]);

  async function fetchSessionAndKedai() {
    const session = getCookieSession();
    let resolvedKedaiId = session?.kedai_id || null;

    if (!resolvedKedaiId && session?.id) {
      const { data: userData } = await supabase.from("users").select("kedai_id").eq("id", session.id).single() as any;
      resolvedKedaiId = userData?.kedai_id || null;
    }
    if (!resolvedKedaiId && session?.username) {
      const { data: userData } = await supabase.from("users").select("kedai_id").eq("username", session.username).single() as any;
      resolvedKedaiId = userData?.kedai_id || null;
    }

    const resolvedSession = { ...(session || {}), kedai_id: resolvedKedaiId };
    setSessionUser(resolvedSession);

    if (resolvedKedaiId) {
      const { data, error } = await supabase.from("kedai").select("nama, status, table_count").eq("id", resolvedKedaiId).single() as any;
      let kedaiData = data || null;
      if (error) {
        const fallback = await supabase.from("kedai").select("nama, status").eq("id", resolvedKedaiId).single() as any;
        kedaiData = fallback.data ? { ...fallback.data, table_count: 6 } : null;
      }
      setKedaiInfo(kedaiData);
      setTableCountInput(Math.min(Math.max(Number(kedaiData?.table_count || 6), 1), 20));

      // UNIFIED fetch — satu call je untuk semua stats
      fetchAllData(resolvedKedaiId);

      if (activeTab === "staff" || activeTab === "settings") fetchStaff(resolvedKedaiId);
      if (activeTab === "inventory") fetchProduk(resolvedKedaiId);
    } else {
      setKedaiInfo(null);
    }
  }

  // UNIFIED data fetch — stats + report dalam satu function, guna filter yang sama
  async function fetchAllData(kedaiId: string) {
    setLoadingStats(true);
    if (activeTab === "laporan") setLoadingReport(true);

    const { from, to } = getDateRange(filter, customFrom, customTo);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["paid", "done"])
      .eq("kedai_id", kedaiId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false }) as any;

    const { data: stokRendah } = await supabase.from("produk").select("id").eq("kedai_id", kedaiId).lte("stok", 5).eq("is_active", true) as any;
    const { data: produkData } = await supabase.from("produk").select("id, nama, stok").eq("kedai_id", kedaiId).eq("is_active", true).order("stok", { ascending: true }) as any;

    const orders = ordersData || [];

    const jumlahJualan = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const jumlahTransaksi = orders.length;
    let jumlahCOGS = 0;
    orders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        jumlahCOGS += Number(item.kos || 0) * Number(item.qty || 0);
      });
    });
    const jumlahUntung = jumlahJualan - jumlahCOGS;
    const jumlahMargin = jumlahJualan > 0 ? Math.round((jumlahUntung / jumlahJualan) * 100) : 0;

    setStats({
      jumlahJualan,
      jumlahTransaksi,
      jumlahCOGS,
      jumlahUntung,
      jumlahMargin,
      stokKritikal: stokRendah?.length || 0,
    });
    setLoadingStats(false);

    // Report data — kiraan lanjut dari orders yang sama
    if (activeTab === "laporan") {
      const dineInOrders = orders.filter((o: any) => {
        const meja = String(o.meja || "").toLowerCase();
        return meja && !meja.includes("bungkus") && !meja.includes("takeaway");
      }).length;
      const takeawayOrders = orders.filter((o: any) => {
        const meja = String(o.meja || "").toLowerCase();
        return meja.includes("bungkus") || meja.includes("takeaway");
      }).length;

      const productMap: Record<string, ReportTopProduct> = {};
      const paymentMap: Record<string, PaymentSummaryItem> = {};

      orders.forEach((order: any) => {
        // FIX: simpan payment method betul-betul
        const pm = String(order.payment_method || order.paymentMethod || order.payment || order.bayaran || "Belum direkod");
        if (!paymentMap[pm]) paymentMap[pm] = { method: pm, total: 0, count: 0 };
        paymentMap[pm].total += Number(order.total || 0);
        paymentMap[pm].count += 1;

        (order.order_items || []).forEach((item: any) => {
          const nama = item.nama || "Produk";
          const qty = Number(item.qty || 0);
          const harga = Number(item.harga || 0);
          if (!productMap[nama]) productMap[nama] = { nama, qty: 0, total: 0 };
          productMap[nama].qty += qty;
          productMap[nama].total += harga * qty;
        });
      });

      const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
      const paymentSummary = Object.values(paymentMap).sort((a, b) => b.total - a.total);
      const inventoryReport = (produkData || []).slice(0, 6).map((item: any) => ({
        id: item.id,
        nama: item.nama,
        stok: Number(item.stok || 0),
        status: Number(item.stok || 0) <= 0 ? "Habis" : Number(item.stok || 0) <= 5 ? "Rendah" : "Cukup",
      })) as InventoryReportItem[];

      const recentReceipts = orders.slice(0, 8).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        meja: order.meja || null,
        status: order.status,
        total: Number(order.total || 0),
        payment_method: order.payment_method || order.paymentMethod || order.payment || order.bayaran || null,
        order_items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          nama: item.nama || "Produk",
          qty: Number(item.qty || 0),
          harga: Number(item.harga || 0),
          kos: Number(item.kos || 0),
          nota: item.nota || null,
        })),
      }));

      setReportData({
        totalSales: jumlahJualan,
        totalOrders: jumlahTransaksi,
        averageOrderValue: jumlahTransaksi > 0 ? jumlahJualan / jumlahTransaksi : 0,
        dineInOrders,
        takeawayOrders,
        grossProfit: jumlahUntung,
        cogs: jumlahCOGS,
        margin: jumlahMargin,
        topProducts,
        inventoryReport,
        paymentSummary,
        recentReceipts,
      });
      setLoadingReport(false);
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

  async function addStaff() {
    if (!newStaffNama.trim() || !newStaffUsername.trim()) return;
    setSaving(true);
    setStaffError("");
    const { data: existing } = await supabase.from("users").select("id").eq("username", newStaffUsername.toLowerCase()).single() as any;
    if (existing) { setStaffError("Username '" + newStaffUsername + "' dah digunakan."); setSaving(false); return; }
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
    setEditProdukId(p.id); setEditProdukNama(p.nama); setEditProdukHarga(p.harga_jual.toString());
    setEditProdukKos(p.kos_produk.toString()); setEditStokSemasa(p.stok);
    setEditStokMode("tambah"); setEditStokQty(""); setEditStokReason(""); setEditStokError("");
  }

  function closeEditProduk() {
    setEditProdukId(null); setEditProdukNama(""); setEditProdukHarga(""); setEditProdukKos("");
    setEditStokSemasa(0); setEditStokQty(""); setEditStokReason(""); setEditStokError("");
  }

  async function submitEditProduk() {
    if (!editProdukId) return;
    setEditStokError(""); setSaving(true);
    let stokBaru = editStokSemasa;
    if (editStokQty) {
      const qty = parseInt(editStokQty);
      if (isNaN(qty) || qty <= 0) { setEditStokError("Jumlah stok tidak sah."); setSaving(false); return; }
      if (!editStokReason.trim()) { setEditStokError("Sila isi sebab perubahan stok."); setSaving(false); return; }
      stokBaru = editStokMode === "tambah" ? editStokSemasa + qty : editStokSemasa - qty;
      if (stokBaru < 0) { setEditStokError(`Stok tidak mencukupi. Stok semasa: ${editStokSemasa} unit.`); setSaving(false); return; }
    }
    await supabase.from("produk").update({ nama: editProdukNama, harga_jual: parseFloat(editProdukHarga) || 0, kos_produk: parseFloat(editProdukKos) || 0, stok: stokBaru } as any).eq("id", editProdukId);
    closeEditProduk(); setSaving(false);
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

  async function saveTableCount() {
    if (!sessionUser?.kedai_id) return;
    const finalCount = Math.min(Math.max(Number(tableCountInput) || 6, 1), 20);
    setSaving(true); setTableMsg("");
    const { error } = await supabase.from("kedai").update({ table_count: finalCount } as any).eq("id", sessionUser.kedai_id);
    setSaving(false);
    if (error) { setTableMsg("❌ Gagal simpan bilangan meja."); return; }
    setKedaiInfo((prev) => prev ? { ...prev, table_count: finalCount } : prev);
    setTableCountInput(finalCount);
    setTableMsg("✅ Setup meja berjaya disimpan.");
    setTimeout(() => setTableMsg(""), 3000);
  }

  function changeTableCount(value: number) {
    setTableMsg("");
    setTableCountInput(Math.min(Math.max(value, 1), 20));
  }

  function formatDateLabel(date: string) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function openFilterModal() {
    setPendingFilter(filter);
    setPendingCustomFrom(customFrom);
    setPendingCustomTo(customTo);
    setShowFilterModal(true);
  }

  function applyFilterModal() {
    if (pendingFilter === "custom" && (!pendingCustomFrom || !pendingCustomTo)) return;

    setFilter(pendingFilter);

    if (pendingFilter === "custom") {
      setCustomFrom(pendingCustomFrom);
      setCustomTo(pendingCustomTo);
    }

    setShowFilterModal(false);
  }

  function filterLabel() {
    if (filter === "daily") return "Hari Ini";
    if (filter === "weekly") return "Minggu";
    if (filter === "monthly") return "Bulan Ini";
    if (filter === "custom" && customFrom && customTo) return `${formatDateLabel(customFrom)} — ${formatDateLabel(customTo)}`;
    return "Tarikh Custom";
  }

  function pendingFilterLabel(value: FilterType) {
    if (value === "daily") return "Hari Ini";
    if (value === "weekly") return "Minggu";
    if (value === "monthly") return "Bulan Ini";
    return "Tarikh Custom";
  }

  function formatRM(value: number) { return `RM ${Number(value || 0).toFixed(2)}`; }

  function formatReceiptDate(dateValue: string) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleString("ms-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function displayMejaLabel(meja?: string | null) {
    if (!meja) return "-";
    if (meja === "Bungkus") return "Bungkus";
    if (meja.startsWith("Meja")) return meja;
    if (meja.startsWith("T")) return `Meja ${meja.replace("T", "")}`;
    return meja;
  }

  function downloadReceipt(receipt: RecentReceipt) {
    const receiptNo = receipt.id.slice(0, 8).toUpperCase();
    const lines = [
      "URUSPOS RECEIPT", kedaiInfo?.nama || "Kedai Saya", "",
      `Receipt: #${receiptNo}`, `Tarikh: ${formatReceiptDate(receipt.created_at)}`,
      `Jenis: ${displayMejaLabel(receipt.meja)}`, `Bayaran: ${receipt.payment_method || "Belum direkod"}`, "", "ITEM",
      ...receipt.order_items.flatMap((item) => {
        const baseLine = `${item.nama} x${item.qty} @ ${formatRM(item.harga)} = ${formatRM(item.qty * item.harga)}`;
        return item.nota ? [baseLine, `Nota: ${item.nota}`] : [baseLine];
      }),
      "", `TOTAL: ${formatRM(receipt.total)}`, "", "Terima kasih.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `receipt-${receiptNo}.txt`;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  const marginTambah = produkHarga && produkKos ? Math.round((parseFloat(produkHarga) - parseFloat(produkKos)) / parseFloat(produkHarga) * 100) : 0;
  const marginEdit = editProdukHarga && editProdukKos ? Math.round((parseFloat(editProdukHarga) - parseFloat(editProdukKos)) / parseFloat(editProdukHarga) * 100) : 0;
  const previewStokBaru = editStokQty && !isNaN(parseInt(editStokQty)) ? editStokMode === "tambah" ? editStokSemasa + parseInt(editStokQty) : editStokSemasa - parseInt(editStokQty) : null;

  function normalizeKedaiStatus(status?: string | null) { return String(status || "").trim().toLowerCase(); }
  const kedaiStatus = normalizeKedaiStatus(kedaiInfo?.status);
  const isBeta = kedaiStatus === "beta";
  const isActivePlan = kedaiStatus === "active" || kedaiStatus === "aktif";
  const isSuspended = kedaiStatus === "suspended" || kedaiStatus === "suspend";

  const planInfo = isBeta
    ? { label: "BETA", title: "⏳ Beta — Cuba Percuma", bg: "bg-yellow-50 border-yellow-200", titleColor: "text-yellow-800", labelColor: "text-yellow-700", pill: "bg-yellow-200 text-yellow-800" }
    : isActivePlan
      ? { label: "AKTIF", title: "✅ Aktif — 2% Jualan", bg: "bg-green-50 border-green-200", titleColor: "text-green-800", labelColor: "text-green-700", pill: "bg-green-200 text-green-800" }
      : isSuspended
        ? { label: "SUSPENDED", title: "⛔ Suspended — Akses Ditangguhkan", bg: "bg-red-50 border-red-200", titleColor: "text-red-800", labelColor: "text-red-700", pill: "bg-red-200 text-red-800" }
        : { label: "BELUM SET", title: "⚠️ Status kedai belum ditetapkan", bg: "bg-gray-50 border-gray-200", titleColor: "text-gray-800", labelColor: "text-gray-600", pill: "bg-gray-200 text-gray-800" };

  const urusposFee = isActivePlan ? stats.jumlahJualan * 0.02 : 0;

  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Utama", description: "Ringkasan jualan" },
    { id: "inventory", icon: "📦", label: "Inventori", description: "Produk & stok" },
    { id: "laporan", icon: "📊", label: "Laporan", description: "Prestasi kedai" },
    { id: "staff", icon: "👥", label: "Staff", description: "Akaun pekerja" },
    { id: "settings", icon: "⚙️", label: "Tetapan", description: "Password & akses" },
  ];

  function changeTab(tabId: string) { setActiveTab(tabId); setShowMobileMenu(false); }
  const activeNav = navItems.find((item) => item.id === activeTab);

  const FilterBar = () => (
    <button
      onClick={openFilterModal}
      className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-full text-xs font-black shadow-sm hover:border-green-300 hover:bg-green-50 active:scale-95 transition-all mb-4"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-green-600">
        <path d="M7 3V6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M17 3V6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M4 9H20" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M6.5 5H17.5C18.8807 5 20 6.11929 20 7.5V18C20 19.3807 18.8807 20.5 17.5 20.5H6.5C5.11929 20.5 4 19.3807 4 18V7.5C4 6.11929 5.11929 5 6.5 5Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
      </svg>
      <span>{filterLabel()}</span>
      <span className="text-gray-400 text-[10px]">▾</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setShowMobileMenu(true)} className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 font-black text-xl flex items-center justify-center shadow-sm active:scale-95 transition-all" aria-label="Buka menu">☰</button>
            <div className="min-w-0">
              <span className="text-gray-900 font-black text-xl block leading-none">Urus<span className="text-green-600">POS</span></span>
              <div className="text-gray-400 text-xs font-bold mt-1 truncate">{activeNav?.label || "Owner"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden xs:block">
              <div className="text-gray-900 font-bold text-sm leading-tight">{sessionUser?.nama || "Owner"}</div>
              <div className="text-green-600 text-xs font-semibold">👑 Owner</div>
            </div>
            <a href="/auth/logout" className="bg-gray-50 border border-gray-200 text-gray-500 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all">Log Keluar</a>
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

            <FilterBar />

            <div className="bg-gradient-to-br from-green-800 to-green-500 rounded-2xl p-6 mb-4">
              <div className="text-green-100 text-sm">Jualan — {filterLabel()}</div>
              <div className="text-white text-4xl font-black mt-1">RM {stats.jumlahJualan.toFixed(2)}</div>
              <div className="flex gap-3 mt-3">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">🧾 {stats.jumlahTransaksi} transaksi</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">💰</div><div className="text-green-600 text-lg font-black">RM {stats.jumlahUntung.toFixed(0)}</div><div className="text-gray-400 text-xs mt-1">Untung Kasar</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">📊</div><div className="text-gray-900 text-lg font-black">{stats.jumlahMargin}%</div><div className="text-gray-400 text-xs mt-1">Margin</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">⚠️</div><div className="text-amber-500 text-lg font-black">{stats.stokKritikal} item</div><div className="text-gray-400 text-xs mt-1">Stok Kritikal</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">👥</div><div className="text-gray-900 text-lg font-black">{staff.length} orang</div><div className="text-gray-400 text-xs mt-1">Jumlah Staff</div></div>
            </div>

            <div className={`rounded-2xl p-4 mb-3 border flex items-center justify-between ${planInfo.bg}`}>
              <div>
                <div className={`text-xs font-bold mb-0.5 ${planInfo.labelColor}`}>PLAN SEMASA</div>
                <div className={`text-sm font-black ${planInfo.titleColor}`}>{planInfo.title}</div>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${planInfo.pill}`}>{planInfo.label}</span>
            </div>

            {isActivePlan ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="text-green-700 text-xs font-bold mb-1">📊 Fee UrusPOS — {filterLabel()}</div>
                <div className="text-gray-900 text-2xl font-black">RM {urusposFee.toFixed(2)}</div>
                <div className="text-gray-400 text-xs mt-1">2% daripada jualan RM {stats.jumlahJualan.toFixed(2)}</div>
              </div>
            ) : isBeta ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <div className="text-yellow-700 text-xs font-bold mb-1">📊 Fee UrusPOS — {filterLabel()}</div>
                <div className="flex items-center gap-3">
                  <div className="text-gray-900 text-2xl font-black">RM 0.00</div>
                  <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">🎉 Free semasa Beta</span>
                </div>
                <div className="text-yellow-600 text-xs mt-1">Jualan RM {stats.jumlahJualan.toFixed(2)} — tiada caj semasa beta</div>
              </div>
            ) : isSuspended ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="text-red-700 text-xs font-bold mb-1">📊 Fee UrusPOS</div>
                <div className="text-gray-900 text-2xl font-black">RM 0.00</div>
                <div className="text-red-600 text-xs mt-1">Akaun suspended — caj tidak dikira.</div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="text-gray-600 text-xs font-bold mb-1">📊 Fee UrusPOS</div>
                <div className="text-gray-900 text-2xl font-black">RM 0.00</div>
                <div className="text-gray-500 text-xs mt-1">Status kedai belum dibaca.</div>
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
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-gray-900 font-black text-xl">Laporan Owner</h2>
                <p className="text-gray-400 text-xs font-bold mt-1">Prestasi kedai ikut tempoh dipilih</p>
              </div>
              <button onClick={() => fetchAllData(sessionUser?.kedai_id)} disabled={loadingReport} className="bg-white border border-gray-200 text-gray-600 text-xs font-black px-4 py-2 rounded-full shadow-sm disabled:opacity-50">
                {loadingReport ? "Loading..." : "Refresh"}
              </button>
            </div>

            <FilterBar />

            <div className="bg-gradient-to-br from-gray-950 to-gray-800 rounded-3xl p-5 mb-4 text-white shadow-lg">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-gray-400 text-xs font-black uppercase tracking-wide">Jumlah Jualan — {filterLabel()}</div>
                  <div className="text-3xl sm:text-4xl font-black mt-1">{formatRM(reportData.totalSales)}</div>
                </div>
                <div className="bg-white/10 text-white text-xs font-black px-3 py-1 rounded-full">{filterLabel()}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-2xl p-3"><div className="text-gray-400 text-xs font-bold">Jumlah Order</div><div className="text-white text-xl font-black mt-1">{reportData.totalOrders}</div></div>
                <div className="bg-white/10 rounded-2xl p-3"><div className="text-gray-400 text-xs font-bold">Purata Order</div><div className="text-white text-xl font-black mt-1">{formatRM(reportData.averageOrderValue)}</div></div>
                <div className="bg-white/10 rounded-2xl p-3"><div className="text-gray-400 text-xs font-bold">Dine-in</div><div className="text-white text-xl font-black mt-1">{reportData.dineInOrders}</div></div>
                <div className="bg-white/10 rounded-2xl p-3"><div className="text-gray-400 text-xs font-bold">Bungkus</div><div className="text-white text-xl font-black mt-1">{reportData.takeawayOrders}</div></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">💰</div><div className="text-green-600 text-lg font-black">{formatRM(reportData.grossProfit)}</div><div className="text-gray-400 text-xs mt-1">Untung Kasar</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">📉</div><div className="text-red-500 text-lg font-black">{formatRM(reportData.cogs)}</div><div className="text-gray-400 text-xs mt-1">COGS</div></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="text-xl mb-1">📊</div><div className="text-gray-900 text-lg font-black">{reportData.margin}%</div><div className="text-gray-400 text-xs mt-1">Margin</div></div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-black text-sm">🔥 Top Product</h3>
                <span className="text-gray-400 text-xs font-bold">Top 5</span>
              </div>
              {reportData.topProducts.length === 0 ? (
                <div className="text-center py-6"><div className="text-3xl mb-2">🍽️</div><div className="text-gray-400 text-sm">Belum ada produk terjual</div></div>
              ) : (
                <div className="space-y-3">
                  {reportData.topProducts.map((item, index) => (
                    <div key={`${item.nama}-${index}`} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black ${index === 0 ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>{index + 1}</div>
                      <div className="flex-1 min-w-0"><div className="text-gray-900 font-bold text-sm truncate">{item.nama}</div><div className="text-gray-400 text-xs">{item.qty} terjual</div></div>
                      <div className="text-gray-900 text-sm font-black">{formatRM(item.total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-black text-sm">💳 Payment Method</h3>
                <span className="text-gray-400 text-xs font-bold">{reportData.paymentSummary.length} jenis</span>
              </div>
              {reportData.paymentSummary.length === 0 ? (
                <div className="text-center py-6"><div className="text-3xl mb-2">💳</div><div className="text-gray-400 text-sm">Belum ada rekod bayaran</div></div>
              ) : (
                <div className="space-y-3">
                  {reportData.paymentSummary.map((item) => (
                    <div key={item.method} className="flex items-center justify-between bg-gray-50 rounded-2xl p-3">
                      <div><div className="text-gray-900 text-sm font-black">{item.method}</div><div className="text-gray-400 text-xs">{item.count} order</div></div>
                      <div className="text-green-600 text-sm font-black">{formatRM(item.total)}</div>
                    </div>
                  ))}
                </div>
              )}
              {reportData.paymentSummary.some(p => p.method === "Belum direkod") && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <div className="text-amber-700 text-xs font-bold">⚠️ Ada order yang payment method belum disimpan. Pastikan staff pilih Tunai atau DuitNow masa checkout.</div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-black text-sm">📦 Inventory Report</h3>
                <span className="text-gray-400 text-xs font-bold">Stok semasa</span>
              </div>
              {reportData.inventoryReport.length === 0 ? (
                <div className="text-center py-6"><div className="text-3xl mb-2">📦</div><div className="text-gray-400 text-sm">Belum ada produk aktif</div></div>
              ) : (
                <div className="space-y-3">
                  {reportData.inventoryReport.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-3">
                      <div className="min-w-0 flex-1"><div className="text-gray-900 text-sm font-black truncate">{item.nama}</div><div className="text-gray-400 text-xs">Stok: {item.stok} unit</div></div>
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${item.status === "Habis" ? "bg-red-100 text-red-600" : item.status === "Rendah" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-black text-sm">🧾 Receipt Preview</h3>
                <span className="text-gray-400 text-xs font-bold">Recent</span>
              </div>
              {reportData.recentReceipts.length === 0 ? (
                <div className="text-center py-8"><div className="text-4xl mb-3">🧾</div><div className="text-gray-400 text-sm">Belum ada receipt dalam tempoh ini</div></div>
              ) : (
                <div className="space-y-3">
                  {reportData.recentReceipts.map((receipt) => (
                    <div key={receipt.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 text-sm font-black truncate">#{receipt.id.slice(0, 8).toUpperCase()}</div>
                          <div className="text-gray-400 text-xs mt-1">{displayMejaLabel(receipt.meja)} · {formatReceiptDate(receipt.created_at)}</div>
                          <div className="text-gray-400 text-xs mt-1">{receipt.payment_method || "Belum direkod"}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-green-600 text-sm font-black whitespace-nowrap mr-1">{formatRM(receipt.total)}</div>
                          <button onClick={() => setSelectedReceipt(receipt)} className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm" title="Preview">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => downloadReceipt(receipt)} className="w-10 h-10 rounded-2xl bg-green-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm" title="Download">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">{s.role === "kitchen" ? "👨‍🍳" : s.role === "manager" ? "👔" : "🧑‍💼"}</div>
                  <div className="flex-1">
                    <div className="text-gray-900 font-bold text-sm">{s.nama}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.role === "kitchen" ? "bg-orange-100 text-orange-600" : s.role === "manager" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>{s.role === "kitchen" ? "Dapur" : s.role === "manager" ? "Manager" : "Cashier"}</span>
                      <span className="text-gray-300 text-xs">@{s.username}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => toggleStaff(s.id, s.is_active)} className={`text-xs font-bold px-2 py-1.5 rounded-xl border ${s.is_active ? "bg-red-50 text-red-500 border-red-200" : "bg-green-50 text-green-600 border-green-200"}`}>{s.is_active ? "Nyahaktif" : "Aktifkan"}</button>
                    <button onClick={() => removeStaff(s.id)} className="text-xs font-bold px-2 py-1.5 rounded-xl border bg-red-50 text-red-500 border-red-200">🗑 Buang</button>
                  </div>
                </div>
              ))}
              {staff.length === 0 && <div className="bg-white rounded-2xl p-8 text-center border border-gray-100"><div className="text-4xl mb-3">👥</div><div className="text-gray-400 text-sm">Belum ada staff</div></div>}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div>
            <h2 className="text-gray-900 font-bold text-lg mb-4">⚙️ Tetapan</h2>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div><h3 className="text-gray-900 font-bold text-sm">🪑 Setup Meja Kedai</h3><p className="text-gray-400 text-xs mt-1">Default 6 meja. Bungkus akan kekal automatik.</p></div>
                <span className="bg-green-50 text-green-700 text-xs font-black px-3 py-1.5 rounded-full border border-green-100">Max 20</span>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <button onClick={() => changeTableCount(tableCountInput - 1)} disabled={tableCountInput <= 1} className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black text-xl disabled:opacity-40 active:scale-95 transition-all">−</button>
                  <div className="text-center"><div className="text-gray-900 text-4xl font-black leading-none">{tableCountInput}</div><div className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-wide">Meja</div></div>
                  <button onClick={() => changeTableCount(tableCountInput + 1)} disabled={tableCountInput >= 20} className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black text-xl disabled:opacity-40 active:scale-95 transition-all">+</button>
                </div>
                <input type="range" min="1" max="20" value={tableCountInput} onChange={(e) => changeTableCount(Number(e.target.value))} className="w-full accent-green-600" />
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {Array.from({ length: tableCountInput }).map((_, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl py-2 text-center text-gray-700 text-xs font-black">{index + 1}</div>
                  ))}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl py-2 text-center text-amber-700 text-xs font-black">🥡</div>
                </div>
                <div className="text-gray-400 text-xs mt-3">POS akan papar Meja 1 hingga Meja {tableCountInput}, dan pilihan Bungkus.</div>
              </div>
              {tableMsg && <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${tableMsg.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{tableMsg}</div>}
              <button onClick={saveTableCount} disabled={saving || tableCountInput === Math.min(Math.max(Number(kedaiInfo?.table_count || 6), 1), 20)} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan Setup Meja"}</button>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
              <h3 className="text-gray-900 font-bold text-sm mb-4">🔐 Tukar Password Saya</h3>
              <div className="mb-3"><label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD SEMASA</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
              <div className="mb-3"><label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD BARU</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
              <div className="mb-4"><label className="text-gray-500 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
              {passwordMsg && <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsg.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{passwordMsg}</div>}
              <button onClick={tukarPassword} disabled={!currentPassword || !newPassword || !confirmPassword} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">Tukar Password</button>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 font-bold text-sm mb-4">👥 Reset Password Staff</h3>
              {resetMsg && <div className="bg-green-50 text-green-700 text-xs font-bold p-3 rounded-xl mb-4">{resetMsg}</div>}
              <div className="flex flex-col gap-3">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div><div className="text-gray-900 text-sm font-bold">{s.nama}</div><div className="text-gray-400 text-xs">@{s.username}</div></div>
                    <button onClick={() => { setResetStaffId(s.id); setResetStaffNama(s.nama); setNewStaffPassword(""); }} className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-2 rounded-xl border border-amber-200">🔑 Reset</button>
                  </div>
                ))}
                {staff.length === 0 && <div className="text-center text-gray-400 text-sm py-4">Tiada staff lagi</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter By Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-gray-900 font-black text-lg">Filter by</h3>
                <p className="text-gray-400 text-xs font-bold mt-0.5">Pilih tempoh laporan</p>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-black flex items-center justify-center active:scale-95 transition-all"
                aria-label="Tutup filter"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["daily", "weekly", "monthly", "custom"] as FilterType[]).map((option) => {
                const isSelected = pendingFilter === option;

                return (
                  <button
                    key={option}
                    onClick={() => setPendingFilter(option)}
                    className={`rounded-2xl border px-3 py-3 text-xs font-black transition-all ${
                      isSelected
                        ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20"
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {pendingFilterLabel(option)}
                  </button>
                );
              })}
            </div>

            {pendingFilter === "custom" && (
              <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs font-black mb-2 block">START DATE</label>
                    <input
                      type="date"
                      value={pendingCustomFrom}
                      onChange={(e) => setPendingCustomFrom(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-bold outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-black mb-2 block">END DATE</label>
                    <input
                      type="date"
                      value={pendingCustomTo}
                      onChange={(e) => setPendingCustomTo(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-bold outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-black py-3.5 rounded-2xl active:scale-95 transition-all"
              >
                Batal
              </button>
              <button
                onClick={applyFilterModal}
                disabled={pendingFilter === "custom" && (!pendingCustomFrom || !pendingCustomTo)}
                className="flex-1 bg-green-600 text-white font-black py-3.5 rounded-2xl disabled:opacity-50 active:scale-95 transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-gray-900 font-black text-lg">Receipt Preview</h3><div className="text-gray-400 text-xs font-bold">#{selectedReceipt.id.slice(0, 8).toUpperCase()}</div></div>
              <button onClick={() => setSelectedReceipt(null)} className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 font-black">✕</button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5 bg-white">
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                <div className="text-gray-900 font-black text-xl">UrusPOS</div>
                <div className="text-gray-500 text-sm font-bold">{kedaiInfo?.nama || "Kedai Saya"}</div>
                <div className="text-gray-400 text-xs mt-2">{formatReceiptDate(selectedReceipt.created_at)}</div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 font-bold mb-1"><span>Order</span><span>#{selectedReceipt.id.slice(0, 8).toUpperCase()}</span></div>
                <div className="flex justify-between text-xs text-gray-500 font-bold mb-1"><span>Jenis</span><span>{displayMejaLabel(selectedReceipt.meja)}</span></div>
                <div className="flex justify-between text-xs text-gray-500 font-bold"><span>Bayaran</span><span>{selectedReceipt.payment_method || "Belum direkod"}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-4 space-y-3">
                {selectedReceipt.order_items.map((item, index) => (
                  <div key={`${item.nama}-${index}`} className="flex justify-between gap-3 text-sm">
                    <div className="flex-1"><div className="text-gray-900 font-bold">{item.nama}</div><div className="text-gray-400 text-xs">{item.qty} x {formatRM(item.harga)}</div>{item.nota && <div className="text-amber-600 text-xs mt-1">Nota: {item.nota}</div>}</div>
                    <div className="text-gray-900 font-black">{formatRM(item.qty * item.harga)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
                <div className="flex justify-between items-center"><span className="text-gray-900 font-black">TOTAL</span><span className="text-gray-900 font-black text-xl">{formatRM(selectedReceipt.total)}</span></div>
              </div>
              <div className="text-center text-gray-400 text-xs mt-5">Terima kasih.</div>
            </div>
            <button onClick={() => setSelectedReceipt(null)} className="w-full mt-4 bg-green-600 text-white font-black py-3 rounded-2xl">Tutup</button>
          </div>
        </div>
      )}

      {/* Menu Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50">
          <button onClick={() => setShowMobileMenu(false)} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-label="Tutup menu" />
          <div className="relative h-full w-[84%] sm:w-[380px] max-w-sm bg-white shadow-2xl p-5 flex flex-col animate-[slideInLeft_0.22s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div><div className="text-gray-900 font-black text-xl leading-none">Urus<span className="text-green-600">POS</span></div><div className="text-green-600 text-xs font-black mt-1 uppercase tracking-wide">Owner Menu</div></div>
              <button onClick={() => setShowMobileMenu(false)} className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-500 font-black active:scale-95 transition-all" aria-label="Tutup menu">✕</button>
            </div>
            <div className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 mb-5 text-white shadow-lg shadow-green-600/20">
              <div className="text-green-100 text-xs font-bold mb-1">KEDAI</div>
              <div className="font-black text-lg leading-tight truncate">{kedaiInfo?.nama || "Kedai Saya"}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full">👑 Owner</span>
                <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full">{planInfo.label}</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => changeTab(item.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all border ${isActive ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20" : "bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100"}`}>
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isActive ? "bg-white/20" : "bg-white border border-gray-100"}`}>{item.icon}</span>
                    <span className="flex-1 min-w-0"><span className="block font-black text-sm">{item.label}</span><span className={`block text-xs font-semibold mt-0.5 ${isActive ? "text-green-100" : "text-gray-400"}`}>{item.description}</span></span>
                    {isActive && <span className="font-black">✓</span>}
                  </button>
                );
              })}
            </div>
            <a href="/auth/logout" className="mt-5 w-full bg-red-50 border border-red-100 text-red-500 font-black text-sm py-4 rounded-2xl text-center">Log Keluar</a>
          </div>
          <style jsx>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-6">➕ Tambah Staff Baru</h3>
            <div className="mb-4"><label className="text-gray-500 text-xs font-bold mb-2 block">NAMA PENUH</label><input type="text" value={newStaffNama} onChange={(e) => setNewStaffNama(e.target.value)} placeholder="cth: Ahmad bin Ali" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
            <div className="mb-4"><label className="text-gray-500 text-xs font-bold mb-2 block">USERNAME</label><input type="text" value={newStaffUsername} onChange={(e) => setNewStaffUsername(e.target.value)} placeholder="cth: ahmad123" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-2 block">ROLE</label>
              <div className="grid grid-cols-3 gap-2">
                {[{id:"staff",label:"🧑‍💼 Cashier"},{id:"kitchen",label:"👨‍🍳 Dapur"},{id:"manager",label:"👔 Manager"}].map((r) => (
                  <button key={r.id} onClick={() => setNewStaffRole(r.id)} className={`py-3 rounded-xl border text-xs font-bold transition-all ${newStaffRole === r.id ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-400"}`}>{r.label}</button>
                ))}
              </div>
            </div>
            {staffError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><div className="text-red-600 text-xs font-bold">⚠️ {staffError}</div></div>}
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
            <div className="mb-4"><label className="text-gray-500 text-xs font-bold mb-2 block">NAMA PRODUK</label><input type="text" value={produkNama} onChange={(e) => setProdukNama(e.target.value)} placeholder="cth: Nasi Lemak" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="text-gray-500 text-xs font-bold mb-2 block">HARGA JUAL (RM)</label><input type="number" value={produkHarga} onChange={(e) => setProdukHarga(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
              <div><label className="text-gray-500 text-xs font-bold mb-2 block">KOS PRODUK (RM)</label><input type="number" value={produkKos} onChange={(e) => setProdukKos(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
            </div>
            <div className="mb-4"><label className="text-gray-500 text-xs font-bold mb-2 block">STOK AWAL</label><input type="number" value={produkStok} onChange={(e) => setProdukStok(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
            {produkHarga && produkKos && (
              <div className={`rounded-xl p-3 mb-4 ${marginTambah >= 40 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className={`text-xs font-bold ${marginTambah >= 40 ? "text-green-700" : "text-amber-700"}`}>💡 Margin: <strong>{marginTambah}%</strong> {marginTambah >= 40 ? "— Bagus! ✓" : "— Rendah sikit ⚠️"}</div>
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
              <div className="mb-3"><label className="text-gray-500 text-xs font-bold mb-1 block">NAMA PRODUK</label><input type="text" value={editProdukNama} onChange={(e) => setEditProdukNama(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-gray-500 text-xs font-bold mb-1 block">HARGA JUAL (RM)</label><input type="number" value={editProdukHarga} onChange={(e) => setEditProdukHarga(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" /></div>
                <div><label className="text-gray-500 text-xs font-bold mb-1 block">KOS PRODUK (RM)</label><input type="number" value={editProdukKos} onChange={(e) => setEditProdukKos(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" /></div>
              </div>
              {editProdukHarga && editProdukKos && (
                <div className={`rounded-xl p-2 mt-3 ${marginEdit >= 40 ? "bg-green-100" : "bg-amber-100"}`}>
                  <div className={`text-xs font-bold ${marginEdit >= 40 ? "text-green-700" : "text-amber-700"}`}>💡 Margin: <strong>{marginEdit}%</strong> {marginEdit >= 40 ? "— Bagus! ✓" : "— Rendah sikit ⚠️"}</div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <div className="text-gray-500 text-xs font-bold mb-3">KEMASKINI STOK</div>
              <div className="flex items-center justify-between mb-3"><span className="text-gray-500 text-xs font-bold">STOK SEMASA</span><span className={`text-lg font-black ${editStokSemasa <= 5 ? "text-red-500" : "text-gray-900"}`}>{editStokSemasa} unit</span></div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => { setEditStokMode("tambah"); setEditStokQty(""); setEditStokError(""); }} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${editStokMode === "tambah" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200 text-gray-400"}`}>➕ Tambah Stok</button>
                <button onClick={() => { setEditStokMode("tolak"); setEditStokQty(""); setEditStokError(""); }} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${editStokMode === "tolak" ? "bg-red-50 border-red-400 text-red-600" : "bg-white border-gray-200 text-gray-400"}`}>➖ Tolak Stok</button>
              </div>
              <div className="mb-3"><label className="text-gray-500 text-xs font-bold mb-1 block">JUMLAH UNIT <span className="text-gray-400 font-normal">(kosongkan kalau tak nak ubah stok)</span></label><input type="number" value={editStokQty} onChange={(e) => { setEditStokQty(e.target.value); setEditStokError(""); }} placeholder="0" min="1" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500 bg-white text-center text-xl font-black" /></div>
              {editStokQty && (
                <>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-bold mb-2 block">SEBAB / REASON</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {(editStokMode === "tambah" ? ["Restock", "Pembelian Baru", "Pindahan", "Lain-lain"] : ["Rosak / Luput", "Hilang", "Guna Sendiri", "Lain-lain"]).map((r) => (
                        <button key={r} onClick={() => setEditStokReason(r)} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left ${editStokReason === r ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-400"}`}>{r}</button>
                      ))}
                    </div>
                    <input type="text" value={editStokReason} onChange={(e) => setEditStokReason(e.target.value)} placeholder="Atau taip reason sendiri..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm outline-none focus:border-green-500 bg-white" />
                  </div>
                  {previewStokBaru !== null && (
                    <div className={`rounded-xl p-2.5 ${previewStokBaru < 0 ? "bg-red-50 border border-red-200" : previewStokBaru <= 5 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                      <div className={`text-xs font-bold ${previewStokBaru < 0 ? "text-red-600" : previewStokBaru <= 5 ? "text-amber-700" : "text-green-700"}`}>
                        {previewStokBaru < 0 ? `⚠️ Stok tidak cukup! Akan jadi ${previewStokBaru} unit.` : previewStokBaru <= 5 ? `⚠️ Stok selepas: ${previewStokBaru} unit (kritikal)` : `✓ Stok selepas: ${previewStokBaru} unit`}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {editStokError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"><div className="text-red-600 text-xs font-bold">⚠️ {editStokError}</div></div>}
            <div className="flex gap-3">
              <button onClick={closeEditProduk} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={submitEditProduk} disabled={saving || !editProdukNama.trim()} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
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
            <div className="mb-6"><label className="text-gray-500 text-xs font-bold mb-2 block">PASSWORD BARU</label><input type="text" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="cth: newpass123" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" /></div>
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