"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Store, CreditCard, BarChart2, Settings,
  ChevronLeft, ChevronRight, X, Menu, LogOut, Plus,
  CheckCircle, Clock, Ban, Trash2, Key, Users, TrendingUp,
  AlertCircle, Check
} from "lucide-react";

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
  serviceCharge: number;
  sst: number;
};

type BillingRecord = {
  id: string;
  kedai_id: string;
  bulan: string;
  jualan: number;
  fee: number;
  status: string;
};

type FilterType = "daily" | "yesterday" | "weekly" | "monthly" | "custom";
type PendingStatusChange = {
  id: string;
  nama: string;
  currentStatus: string;
  targetStatus: string;
};

function getDateRange(filter: FilterType, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  if (filter === "daily") { const from = new Date(now); from.setHours(0, 0, 0, 0); return { from: from.toISOString(), to: to.toISOString() }; }
  if (filter === "yesterday") { const from = new Date(now); from.setDate(now.getDate() - 1); from.setHours(0, 0, 0, 0); const yesterdayTo = new Date(from); yesterdayTo.setHours(23, 59, 59, 999); return { from: from.toISOString(), to: yesterdayTo.toISOString() }; }
  if (filter === "weekly") { const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0); return { from: from.toISOString(), to: to.toISOString() }; }
  if (filter === "monthly") { const from = new Date(now.getFullYear(), now.getMonth(), 1); from.setHours(0, 0, 0, 0); return { from: from.toISOString(), to: to.toISOString() }; }
  if (filter === "custom" && customFrom && customTo) { const from = new Date(customFrom); from.setHours(0, 0, 0, 0); const toCustom = new Date(customTo); toCustom.setHours(23, 59, 59, 999); return { from: from.toISOString(), to: toCustom.toISOString() }; }
  const from = new Date(now); from.setHours(0, 0, 0, 0); return { from: from.toISOString(), to: to.toISOString() };
}

function getCurrentBulan() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const SALES_STATUSES = new Set(["paid", "done", "completed", "complete", "selesai", "closed", "settled"]);
const PAID_PAYMENT_STATUSES = new Set(["paid", "completed", "complete", "success", "successful", "settled", "received", "diterima", "selesai"]);
const NON_SALES_STATUSES = new Set(["cancelled", "canceled", "void", "refund", "refunded", "unpaid", "pending", "draft"]);
const VALID_PAYMENT_METHODS = new Set(["cash", "tunai", "duitnow", "qr", "qrpay", "qr pay", "transfer", "bank_transfer", "bank transfer", "card", "kad"]);

function normalizeText(value: any) { return String(value ?? "").trim().toLowerCase(); }
function getNumberValue(...values: any[]) { for (const value of values) { const n = Number(value); if (!Number.isNaN(n) && n > 0) return n; } return 0; }
function getOrderItemsSubtotal(order: any) { return (order?.order_items || []).reduce((sum: number, item: any) => { const qty = Number(item?.qty || item?.quantity || 0); const harga = Number(item?.harga || item?.harga_jual || item?.price || item?.unit_price || 0); return sum + qty * harga; }, 0); }
function getOrderSubtotal(order: any) { return getNumberValue(order?.subtotal, order?.sub_total, order?.items_subtotal, order?.item_total, order?.jumlah_item) || getOrderItemsSubtotal(order); }
function getOrderServiceChargeAmount(order: any) { const e = getNumberValue(order?.service_charge_amount, order?.serviceChargeAmount, order?.service_charge, order?.serviceCharge, order?.caj_servis_amount, order?.caj_servis); if (e > 0) return e; const rate = getNumberValue(order?.service_charge_rate, order?.serviceChargeRate, order?.caj_servis_rate); if (!rate) return 0; return getOrderSubtotal(order) * (rate / 100); }
function getOrderSstAmount(order: any) { const e = getNumberValue(order?.sst_amount, order?.sstAmount, order?.tax_amount, order?.taxAmount, order?.cukai_amount); if (e > 0) return e; const rate = getNumberValue(order?.sst_rate, order?.sstRate, order?.tax_rate, order?.taxRate); if (!rate) return 0; return (getOrderSubtotal(order) + getOrderServiceChargeAmount(order)) * (rate / 100); }
function getOrderTotal(order: any) { const e = getNumberValue(order?.total, order?.jumlah, order?.jumlah_bayaran, order?.grand_total, order?.total_amount, order?.amount); if (e > 0) return e; return getOrderSubtotal(order) + getOrderServiceChargeAmount(order) + getOrderSstAmount(order); }
function getPaymentMethod(order: any) { return order?.payment_method || order?.paymentMethod || order?.payment || order?.bayaran || order?.kaedah_bayaran || order?.method || null; }
function isPaidSalesOrder(order: any) { const status = normalizeText(order?.status); const paymentStatus = normalizeText(order?.payment_status || order?.paymentStatus || order?.status_bayaran); const paymentMethod = normalizeText(getPaymentMethod(order)); const total = getOrderTotal(order); if (total <= 0) return false; if (SALES_STATUSES.has(status)) return true; if (PAID_PAYMENT_STATUSES.has(paymentStatus)) return true; if (VALID_PAYMENT_METHODS.has(paymentMethod) && !NON_SALES_STATUSES.has(status)) return true; return false; }
function getOrderSalesDate(order: any) { return order?.paid_at || order?.paidAt || order?.completed_at || order?.completedAt || order?.created_at || order?.createdAt || order?.updated_at || order?.updatedAt || null; }
function isOrderInDateRange(order: any, from: string, to: string) { const rawDate = getOrderSalesDate(order); if (!rawDate) return true; const time = new Date(rawDate).getTime(); if (Number.isNaN(time)) return true; return time >= new Date(from).getTime() && time <= new Date(to).getTime(); }

async function attachOrderItemsToOrders(rawOrders: any[]) {
  const orders = rawOrders || [];
  if (orders.length === 0) return [];
  const orderIds = orders.map((o: any) => o.id).filter(Boolean);
  if (orderIds.length === 0) return orders.map((o: any) => ({ ...o, order_items: o.order_items || [] }));
  const itemQueries = [supabase.from("order_items").select("*").in("order_id", orderIds), supabase.from("order_items").select("*").in("orderId", orderIds), supabase.from("order_items").select("*").in("orders_id", orderIds)];
  let itemsData: any[] = [];
  for (const query of itemQueries) { const { data, error } = await query as any; if (!error && data) { itemsData = data; break; } }
  const itemMap: Record<string, any[]> = {};
  (itemsData || []).forEach((item: any) => { const orderId = item.order_id || item.orderId || item.orders_id; if (!orderId) return; if (!itemMap[orderId]) itemMap[orderId] = []; itemMap[orderId].push(item); });
  return orders.map((order: any) => ({ ...order, order_items: order.order_items || itemMap[order.id] || [] }));
}

export default function SuperadminDashboardPage() {
  const [kedaiList, setKedaiList] = useState<Kedai[]>([]);
  const [kedaiStats, setKedaiStats] = useState<{ [id: string]: KedaiStats }>({});
  const [billingMap, setBillingMap] = useState<{ [kedai_id: string]: BillingRecord }>({});
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [updatingBilling, setUpdatingBilling] = useState<string | null>(null);
  const [confirmBilling, setConfirmBilling] = useState<{ kedaiId: string; nama: string; currentStatus: string } | null>(null);
  const [billingBulan, setBillingBulan] = useState(getCurrentBulan());
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<PendingStatusChange | null>(null);
  const [showAddKedai, setShowAddKedai] = useState(false);
  const [newKedaiNama, setNewKedaiNama] = useState("");
  const [newKedaiPlan, setNewKedaiPlan] = useState("beta");
  const [saving, setSaving] = useState(false);
  const [newKedaiOwnerNama, setNewKedaiOwnerNama] = useState("");
  const [newKedaiTelefon, setNewKedaiTelefon] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{ username: string; password: string; kedaiNama: string } | null>(null);
  const [activeTab, setActiveTab] = useState("utama");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [credentialsList, setCredentialsList] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const [filter, setFilter] = useState<FilterType>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [tempFilter, setTempFilter] = useState<FilterType>("daily");
  const [tempCustomFrom, setTempCustomFrom] = useState("");
  const [tempCustomTo, setTempCustomTo] = useState("");

  useEffect(() => { fetchKedai(); }, [filter, customFrom, customTo]);
  useEffect(() => { if (activeTab === "langganan" && kedaiList.length > 0) fetchBilling(); }, [activeTab, kedaiList, billingBulan]);

  async function fetchKedai() {
    const { data } = await supabase.from("kedai").select("*").order("created_at", { ascending: false });
    setKedaiList(data || []);
    if (data && data.length > 0) await fetchAllStats(data);
    setLoading(false);
  }

  async function fetchAllStats(kedais: Kedai[]) {
    const { from, to } = getDateRange(filter, customFrom, customTo);
    const statsMap: { [id: string]: KedaiStats } = {};
    kedais.forEach((kedai) => { statsMap[kedai.id] = { kedai_id: kedai.id, jualan: 0, fee: 0, staff: 0, serviceCharge: 0, sst: 0 }; });
    try {
      const { data: rawOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5000) as any;
      const ordersWithItems = await attachOrderItemsToOrders(rawOrders || []);
      const paidOrders = ordersWithItems.filter(isPaidSalesOrder).filter((o: any) => isOrderInDateRange(o, from, to));
      paidOrders.forEach((order: any) => {
        const kedaiId = order.kedai_id || order.kedaiId || order.store_id || order.storeId;
        if (!kedaiId || !statsMap[kedaiId]) return;
        statsMap[kedaiId].jualan += getOrderTotal(order);
        statsMap[kedaiId].serviceCharge += getOrderServiceChargeAmount(order);
        statsMap[kedaiId].sst += getOrderSstAmount(order);
      });
      const { data: staffData } = await supabase.from("users").select("id, kedai_id, role").neq("role", "superadmin") as any;
      (staffData || []).forEach((user: any) => { const kedaiId = user.kedai_id || user.kedaiId; if (!kedaiId || !statsMap[kedaiId]) return; statsMap[kedaiId].staff += 1; });
      kedais.forEach((kedai) => { const jualan = statsMap[kedai.id]?.jualan || 0; statsMap[kedai.id] = { ...statsMap[kedai.id], jualan, fee: kedai.status === "beta" ? 0 : jualan * 0.02 }; });
    } catch (error) { console.error("fetchAllStats error:", error); }
    setKedaiStats(statsMap);
  }

  async function fetchBilling() {
    setLoadingBilling(true);
    const bulan = billingBulan;
    const isCurrentMonth = bulan === getCurrentBulan();
    const { data } = await supabase.from("billing").select("*").eq("bulan", bulan) as any;
    const map: { [kedai_id: string]: BillingRecord } = {};
    (data || []).forEach((r: BillingRecord) => { map[r.kedai_id] = r; });
    for (const record of (data || [])) {
      const kedai = kedaiList.find(k => k.id === record.kedai_id);
      if (kedai && kedai.status !== "active") { await supabase.from("billing").delete().eq("id", record.id); delete map[record.kedai_id]; }
    }
    if (isCurrentMonth) {
      const activeKedai = kedaiList.filter(k => k.status === "active");
      for (const kedai of activeKedai) {
        if (!map[kedai.id]) {
          const s = kedaiStats[kedai.id];
          const { data: newRecord } = await supabase.from("billing").insert({ kedai_id: kedai.id, bulan, jualan: s?.jualan || 0, fee: s?.fee || 0, status: "unpaid" }).select().single() as any;
          if (newRecord) map[kedai.id] = newRecord;
        } else {
          const s = kedaiStats[kedai.id];
          if (s) { await supabase.from("billing").update({ jualan: s.jualan, fee: s.fee }).eq("id", map[kedai.id].id); map[kedai.id] = { ...map[kedai.id], jualan: s.jualan, fee: s.fee }; }
        }
      }
    }
    setBillingMap(map);
    setLoadingBilling(false);
  }

  async function toggleBillingStatus(kedaiId: string) {
    const record = billingMap[kedaiId];
    if (!record) return;
    setUpdatingBilling(kedaiId);
    const newStatus = record.status === "paid" ? "unpaid" : "paid";
    await supabase.from("billing").update({ status: newStatus }).eq("id", record.id);
    setBillingMap(prev => ({ ...prev, [kedaiId]: { ...prev[kedaiId], status: newStatus } }));
    setUpdatingBilling(null);
  }

  function statusLabel(status: string) {
    if (status === "active") return "Aktif";
    if (status === "beta") return "Beta";
    if (status === "suspended") return "Suspended";
    return status;
  }

  function requestStatusChange(kedai: Kedai, targetStatus: string) {
    setConfirmStatusChange({ id: kedai.id, nama: kedai.nama, currentStatus: kedai.status, targetStatus });
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("kedai").update({ status } as any).eq("id", id);
    setConfirmStatusChange(null);
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
    await supabase.from("billing").delete().eq("kedai_id", id);
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
    const { data } = await supabase.from("users").select("nama, username, password, role, is_active").eq("kedai_id", kedaiId).order("role") as any;
    setCredentialsList(data || []);
    setLoadingCreds(false);
  }

  function openFilterModal() { setTempFilter(filter); setTempCustomFrom(customFrom); setTempCustomTo(customTo); setShowFilterModal(true); }

  function applyDateFilter() {
    if (tempFilter === "custom" && (!tempCustomFrom || !tempCustomTo)) return;
    setFilter(tempFilter);
    if (tempFilter === "custom") { setCustomFrom(tempCustomFrom); setCustomTo(tempCustomTo); }
    setShowFilterModal(false);
  }

  function formatDateLabel(date: string) { return new Date(date).toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" }); }

  function filterLabel() {
    if (filter === "daily") return "Hari Ini";
    if (filter === "yesterday") return "Semalam";
    if (filter === "weekly") return "7 Hari Lepas";
    if (filter === "monthly") return "Bulan Ini";
    if (filter === "custom" && customFrom && customTo) return `${formatDateLabel(customFrom)} — ${formatDateLabel(customTo)}`;
    return "Tarikh Custom";
  }

  function bulanLabel() {
    const [y, m] = billingBulan.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("ms-MY", { month: "long", year: "numeric" });
  }

  function navigateBulan(direction: number) {
    const [y, m] = billingBulan.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setBillingBulan(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setBillingMap({});
  }

  function isCurrentBulan() { return billingBulan === getCurrentBulan(); }
  function formatRM(value: number) { return `RM ${Number(value || 0).toFixed(2)}`; }

  const kedaiStatsList = Object.values(kedaiStats) as KedaiStats[];
  const billingList = Object.values(billingMap) as BillingRecord[];
  const totalJualan = kedaiStatsList.reduce((s, k) => s + k.jualan, 0);
  const totalFee = kedaiStatsList.reduce((s, k) => s + k.fee, 0);
  const stats = { total: kedaiList.length, active: kedaiList.filter(k => k.status === "active").length, beta: kedaiList.filter(k => k.status === "beta").length, suspended: kedaiList.filter(k => k.status === "suspended").length };

  const billingPaid = billingList.filter(b => { const k = kedaiList.find(k => k.id === b.kedai_id); return b.status === "paid" && k?.status === "active"; }).length;
  const billingUnpaid = billingList.filter(b => { const k = kedaiList.find(k => k.id === b.kedai_id); return b.status === "unpaid" && k?.status === "active"; }).length;
  const totalFeePaid = billingList.filter(b => { const k = kedaiList.find(k => k.id === b.kedai_id); return b.status === "paid" && k?.status === "active"; }).reduce((s, b) => s + Number(b.fee), 0);
  const totalFeeUnpaid = billingList.filter(b => { const k = kedaiList.find(k => k.id === b.kedai_id); return b.status === "unpaid" && k?.status === "active"; }).reduce((s, b) => s + Number(b.fee), 0);

  const navItems = [
    { id: "utama", label: "Utama", icon: LayoutDashboard },
    { id: "klien", label: "Klien", icon: Store },
    { id: "langganan", label: "Langganan", icon: CreditCard },
    { id: "laporan", label: "Laporan", icon: BarChart2 },
    { id: "tetapan", label: "Tetapan", icon: Settings },
  ];

  function handleChangeTab(tabId: string) { setActiveTab(tabId); setShowMobileMenu(false); }
  const activeNav = navItems.find(n => n.id === activeTab);

  const FilterButton = () => {
    const filterOptions: { value: FilterType; label: string }[] = [
      { value: "daily", label: "Hari Ini" },
      { value: "yesterday", label: "Semalam" },
      { value: "weekly", label: "7 Hari Lepas" },
      { value: "monthly", label: "Bulan Ini" },
      { value: "custom", label: "Tarikh Custom" },
    ];

    return (
      <div className="relative">
        <button
          onClick={() => setShowFilterDropdown(v => !v)}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-green-400 hover:text-green-700 transition-all"
        >
          <span>{filterLabel()}</span>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${showFilterDropdown ? "-rotate-90" : "rotate-90"}`} />
        </button>

        {showFilterDropdown && (
          <>
            <button aria-label="Tutup filter" onClick={() => setShowFilterDropdown(false)} className="fixed inset-0 z-40 cursor-default" />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
              {filterOptions.map((option) => {
                const isActive = filter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (option.value === "custom") {
                        setTempFilter("custom");
                        setTempCustomFrom(customFrom);
                        setTempCustomTo(customTo);
                        setShowFilterModal(true);
                        setShowFilterDropdown(false);
                      } else {
                        setFilter(option.value);
                        setCustomFrom("");
                        setCustomTo("");
                        setShowFilterDropdown(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left transition-all ${isActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <span>{option.label}</span>
                    {isActive && <Check size={14} className="text-green-600" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* Drawer — mobile & desktop */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50">
          <button onClick={() => setShowMobileMenu(false)} className="absolute inset-0 bg-black/40" />
          <div className="relative h-full w-72 bg-white shadow-xl flex flex-col animate-[slideInLeft_0.2s_ease-out]">
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <div className="text-gray-900 font-bold text-lg tracking-tight">Urus<span className="text-green-600">POS</span></div>
                <div className="text-gray-400 text-xs font-medium tracking-widest uppercase mt-0.5">Superadmin</div>
              </div>
              <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4">
              <div className="text-gray-300 text-[10px] font-semibold tracking-widest uppercase px-2 mb-2">Menu</div>
              {navItems.map((item, index) => {
                const isActive = activeTab === item.id;
                const isLast = index === navItems.length - 1;
                return (
                  <div key={item.id}>
                    <button onClick={() => handleChangeTab(item.id)} className={`w-full text-left py-3 px-2 text-sm font-medium transition-all ${isActive ? "text-green-700" : "text-gray-600 hover:text-gray-900"}`}>
                      {item.label}
                    </button>
                    {!isLast && <div className="border-b border-gray-100 mx-2" />}
                  </div>
                );
              })}
            </nav>
            <div className="px-4 py-4 border-t border-gray-100">
              <a href="/auth/logout" className="flex items-center gap-2 py-2.5 px-2 text-sm text-gray-400 hover:text-red-500 transition-all">
                <LogOut size={15} strokeWidth={1.8} />
                <span>Log Keluar</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(true)} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50">
              <Menu size={20} />
            </button>
            <div className="text-gray-900 font-semibold text-sm">{activeNav?.label || "Utama"}</div>
          </div>
          <div className="hidden md:block text-gray-900 font-bold text-base tracking-tight font-sans">Urus<span className="text-green-600">POS</span></div>
          <a href="/auth/logout" className="md:hidden text-gray-400 text-sm hover:text-gray-600">Keluar</a>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">

          {/* UTAMA */}
          {activeTab === "utama" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Ringkasan</h1>
                  <p className="text-gray-400 text-sm mt-0.5">Semua kedai aktif</p>
                </div>
                <FilterButton />
              </div>

              {/* Hero stat */}
              <div className="bg-green-600 rounded-2xl p-6 mb-4 text-white">
                <div className="text-green-100 text-sm font-medium">Fee Terkumpul — {filterLabel()}</div>
                <div className="text-4xl font-bold mt-1 tracking-tight">{formatRM(totalFee)}</div>
                <div className="flex gap-4 mt-3 text-sm text-green-100">
                  <span>Jualan {formatRM(totalJualan)}</span>
                  <span>·</span>
                  <span>{stats.active} kedai aktif</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-400 text-xs font-medium mb-1">Jumlah Kedai</div>
                  <div className="text-gray-900 text-2xl font-bold">{stats.total}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-400 text-xs font-medium mb-1">Aktif</div>
                  <div className="text-green-600 text-2xl font-bold">{stats.active}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-400 text-xs font-medium mb-1">Beta</div>
                  <div className="text-amber-500 text-2xl font-bold">{stats.beta}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-400 text-xs font-medium mb-1">Suspended</div>
                  <div className="text-red-500 text-2xl font-bold">{stats.suspended}</div>
                </div>
              </div>
            </div>
          )}

          {/* KLIEN */}
          {activeTab === "klien" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Klien</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{kedaiList.length} kedai berdaftar</p>
                </div>
                <div className="flex items-center gap-2">
                  <FilterButton />
                  <button onClick={() => setShowAddKedai(true)} className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-all">
                    <Plus size={15} />
                    <span className="hidden sm:inline">Kedai Baru</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 py-12 text-sm">Memuatkan...</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {kedaiList.map((kedai) => {
                    const s = kedaiStats[kedai.id];
                    return (
                      <div key={kedai.id} className="bg-white rounded-xl p-5 border border-gray-100">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="text-gray-900 font-semibold">{kedai.nama}</div>
                            <div className="text-gray-400 text-xs mt-0.5">{kedai.id.slice(0, 8)}...</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${kedai.status === "active" ? "bg-green-50 text-green-700 border-green-100" : kedai.status === "beta" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                              {statusLabel(kedai.status)}
                            </span>
                            <button onClick={() => setConfirmDelete(kedai.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pb-4 border-b border-gray-50 mb-4">
                          <div>
                            <div className="text-gray-400 text-xs mb-0.5">Jualan</div>
                            <div className="text-gray-900 text-sm font-semibold">{formatRM(s?.jualan || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-0.5">Fee (2%)</div>
                            <div className="text-gray-900 text-sm font-semibold">{kedai.status === "beta" ? <span className="text-amber-500">—</span> : formatRM(s?.fee || 0)}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-0.5">Staff</div>
                            <div className="text-gray-900 text-sm font-semibold">{s?.staff || 0}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {kedai.status !== "active" && <button onClick={() => requestStatusChange(kedai, "active")} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition-all">Aktifkan</button>}
                          {kedai.status !== "beta" && <button onClick={() => requestStatusChange(kedai, "beta")} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-all">Beta</button>}
                          {kedai.status !== "suspended" && <button onClick={() => requestStatusChange(kedai, "suspended")} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all">Suspend</button>}
                          <button onClick={() => fetchCredentials(kedai.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-1">
                            <Key size={12} /> Credentials
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LANGGANAN */}
          {activeTab === "langganan" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Langganan</h1>
                  <p className="text-gray-400 text-sm mt-0.5">Status bayaran bulanan</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigateBulan(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-sm font-medium text-gray-700 min-w-[110px] text-center">{bulanLabel()}</div>
                  <button onClick={() => navigateBulan(1)} disabled={isCurrentBulan()} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-400 text-xs mb-1">Jumlah Fee</div>
                  <div className="text-gray-900 font-bold">{formatRM(totalFeePaid + totalFeeUnpaid)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-100">
                  <div className="text-green-600 text-xs mb-1 font-medium">Dah Bayar</div>
                  <div className="text-gray-900 font-bold">{formatRM(totalFeePaid)}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{billingPaid} kedai</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-red-100">
                  <div className="text-red-500 text-xs mb-1 font-medium">Belum Bayar</div>
                  <div className="text-gray-900 font-bold">{formatRM(totalFeeUnpaid)}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{billingUnpaid} kedai</div>
                </div>
              </div>

              {loadingBilling ? (
                <div className="text-center text-gray-400 py-10 text-sm">Memuatkan...</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {kedaiList.map((kedai) => {
                    const s = kedaiStats[kedai.id];
                    const billing = billingMap[kedai.id];
                    const isActive = kedai.status === "active";
                    const isPaid = billing?.status === "paid";

                    return (
                      <div key={kedai.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 text-sm font-medium truncate">{kedai.nama}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${kedai.status === "active" ? "bg-green-50 text-green-700 border-green-100" : kedai.status === "beta" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                              {statusLabel(kedai.status)}
                            </span>
                            {isActive && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${isPaid ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                                {isPaid ? "Dah Bayar" : "Belum Bayar"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-gray-900 text-sm font-semibold">
                              {isActive ? formatRM(s?.fee || 0) : kedai.status === "beta" ? <span className="text-amber-500 text-xs">Free</span> : <span className="text-gray-300">—</span>}
                            </div>
                            {isActive && <div className="text-gray-400 text-xs">Jualan {formatRM(s?.jualan || 0)}</div>}
                          </div>
                          {isActive && (
                            <button
                              onClick={() => setConfirmBilling({ kedaiId: kedai.id, nama: kedai.nama, currentStatus: billing?.status || "unpaid" })}
                              disabled={updatingBilling === kedai.id}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${isPaid ? "bg-red-50 border-red-100 text-red-400 hover:bg-red-100" : "bg-green-50 border-green-100 text-green-600 hover:bg-green-100"}`}
                            >
                              {updatingBilling === kedai.id ? <span className="text-xs">...</span> : isPaid ? <X size={14} /> : <Check size={14} />}
                            </button>
                          )}
                        </div>
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
              <div className="mb-6">
                <h1 className="text-gray-900 font-semibold text-xl">Laporan</h1>
                <p className="text-gray-400 text-sm mt-0.5">Coming soon — laporan per kedai</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <BarChart2 size={32} className="text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Laporan per kedai akan dibangunkan.</div>
              </div>
            </div>
          )}

          {/* TETAPAN */}
          {activeTab === "tetapan" && (
            <div>
              <div className="mb-6">
                <h1 className="text-gray-900 font-semibold text-xl">Tetapan</h1>
                <p className="text-gray-400 text-sm mt-0.5">Konfigurasi sistem</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <Settings size={32} className="text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Tetapan sistem akan ditambah.</div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-gray-100 shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-gray-900 font-semibold">Tempoh Laporan</div>
              <button onClick={() => setShowFilterModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {([{ value: "daily", label: "Hari Ini" }, { value: "yesterday", label: "Semalam" }, { value: "weekly", label: "7 Hari Lepas" }, { value: "monthly", label: "Bulan Ini" }, { value: "custom", label: "Tarikh Custom" }] as { value: FilterType; label: string }[]).map((option) => (
                  <button key={option.value} onClick={() => setTempFilter(option.value)} className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all text-left ${tempFilter === option.value ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"}`}>
                    {option.label}
                  </button>
                ))}
              </div>
              {tempFilter === "custom" && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Dari</label>
                    <input type="date" value={tempCustomFrom} onChange={(e) => setTempCustomFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1 block">Hingga</label>
                    <input type="date" value={tempCustomTo} onChange={(e) => setTempCustomTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-green-400" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowFilterModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={applyDateFilter} disabled={tempFilter === "custom" && (!tempCustomFrom || !tempCustomTo)} className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-green-700 transition-all">Guna</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Billing */}
      {confirmBilling && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Tukar Status Bayaran</div>
            <p className="text-gray-500 text-sm mb-5">{confirmBilling.nama} — {confirmBilling.currentStatus === "paid" ? "Dah Bayar → Belum Bayar" : "Belum Bayar → Dah Bayar"}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmBilling(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={() => { toggleBillingStatus(confirmBilling.kedaiId); setConfirmBilling(null); }} className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium ${confirmBilling.currentStatus === "paid" ? "bg-red-500" : "bg-green-600"}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Status Change */}
      {confirmStatusChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Tukar Status Kedai</div>
            <p className="text-gray-500 text-sm mb-1">{confirmStatusChange.nama}</p>
            <p className="text-gray-400 text-sm mb-5">{statusLabel(confirmStatusChange.currentStatus)} → {statusLabel(confirmStatusChange.targetStatus)}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmStatusChange(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={() => updateStatus(confirmStatusChange.id, confirmStatusChange.targetStatus)} className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium ${confirmStatusChange.targetStatus === "suspended" ? "bg-red-500" : confirmStatusChange.targetStatus === "beta" ? "bg-amber-500" : "bg-green-600"}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Buang Kedai?</div>
            <p className="text-gray-500 text-sm mb-5">Tindakan ini tidak boleh dibatalkan.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={() => deleteKedai(confirmDelete)} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium">Buang</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Kedai */}
      {showAddKedai && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="text-gray-900 font-semibold">Tambah Kedai Baru</div>
              <button onClick={() => setShowAddKedai(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X size={16} /></button>
            </div>
            <div className="mb-4"><label className="text-gray-500 text-xs font-medium mb-1 block">NAMA KEDAI</label><input type="text" value={newKedaiNama} onChange={(e) => setNewKedaiNama(e.target.value)} placeholder="cth: Kedai Makan Pak Ali" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400" /></div>
            <div className="mb-4"><label className="text-gray-500 text-xs font-medium mb-1 block">NAMA OWNER</label><input type="text" value={newKedaiOwnerNama} onChange={(e) => setNewKedaiOwnerNama(e.target.value)} placeholder="cth: Encik Ali bin Ahmad" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400" /></div>
            <div className="mb-4"><label className="text-gray-500 text-xs font-medium mb-1 block">NO TELEFON (OPTIONAL)</label><input type="text" value={newKedaiTelefon} onChange={(e) => setNewKedaiTelefon(e.target.value)} placeholder="cth: 0123456789" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400" /></div>
            <div className="mb-5">
              <label className="text-gray-500 text-xs font-medium mb-2 block">PLAN</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setNewKedaiPlan("beta")} className={`py-3 rounded-lg border text-sm font-medium transition-all ${newKedaiPlan === "beta" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Beta<div className="text-xs font-normal mt-0.5 opacity-70">Free 2 bulan</div></button>
                <button onClick={() => setNewKedaiPlan("active")} className={`py-3 rounded-lg border text-sm font-medium transition-all ${newKedaiPlan === "active" ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>Aktif<div className="text-xs font-normal mt-0.5 opacity-70">2% jualan</div></button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddKedai(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Batal</button>
              <button onClick={addKedai} disabled={saving || !newKedaiNama.trim() || !newKedaiOwnerNama.trim()} className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50">{saving ? "Menyimpan..." : "Cipta Kedai"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Creds */}
      {generatedCreds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Kedai Berjaya Dicipta</div>
            <p className="text-gray-500 text-sm mb-5">Hantar credentials ini kepada owner.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Kedai</span><span className="text-gray-900 font-medium">{generatedCreds.kedaiNama}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Username</span><span className="text-gray-900 font-mono font-medium">{generatedCreds.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Password</span><span className="text-gray-900 font-mono font-medium">{generatedCreds.password}</span></div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(`Selamat datang ke UrusPOS!\nKedai: ${generatedCreds.kedaiNama}\nUsername: ${generatedCreds.username}\nPassword: ${generatedCreds.password}\nLogin: uruspos.vercel.app`)} className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium mb-2">Copy Mesej WhatsApp</button>
            <button onClick={() => setGeneratedCreds(null)} className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Tutup</button>
          </div>
        </div>
      )}

      {/* View Credentials */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="text-gray-900 font-semibold">Credentials</div>
              <button onClick={() => setShowCredentials(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><X size={16} /></button>
            </div>
            {loadingCreds ? (
              <div className="text-center text-gray-400 py-6 text-sm">Memuatkan...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {credentialsList.map((user, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-900 text-sm font-medium">{user.nama}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${user.role === "owner" ? "bg-green-50 text-green-700 border-green-100" : user.role === "staff" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>{user.role}</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Username</span><span className="text-gray-900 font-mono">{user.username}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Password</span><span className="text-gray-900 font-mono">{user.password || "abc123"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={user.is_active ? "text-green-600" : "text-red-500"}>{user.is_active ? "Aktif" : "Tidak Aktif"}</span></div>
                    </div>
                  </div>
                ))}
                {credentialsList.length === 0 && <div className="text-center text-gray-400 py-6 text-sm">Tiada user.</div>}
              </div>
            )}
            <button onClick={() => setShowCredentials(null)} className="w-full mt-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">Tutup</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}