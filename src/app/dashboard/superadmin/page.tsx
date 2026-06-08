"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Store,
  CreditCard,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  LogOut,
  Plus,
  Trash2,
  Key,
  Check,
  Repeat2
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

type PendingStatusChange = {
  id: string;
  nama: string;
  currentStatus: string;
  targetStatus: string;
};

type PendingPlanChange = {
  id: string;
  nama: string;
  currentStatus: string;
};

function getMonthToDateRange(): { from: string; to: string } {
  const now = new Date();

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

function getCurrentBulan() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const SALES_STATUSES = new Set(["paid", "done", "completed", "complete", "selesai", "closed", "settled"]);
const PAID_PAYMENT_STATUSES = new Set(["paid", "completed", "complete", "success", "successful", "settled", "received", "diterima", "selesai"]);
const NON_SALES_STATUSES = new Set(["cancelled", "canceled", "void", "refund", "refunded", "unpaid", "pending", "draft"]);
const VALID_PAYMENT_METHODS = new Set(["cash", "tunai", "duitnow", "qr", "qrpay", "qr pay", "transfer", "bank_transfer", "bank transfer", "card", "kad"]);

function normalizeText(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function getNumberValue(...values: any[]) {
  for (const value of values) {
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  return 0;
}

function getOrderItemsSubtotal(order: any) {
  return (order?.order_items || []).reduce((sum: number, item: any) => {
    const qty = Number(item?.qty || item?.quantity || 0);
    const harga = Number(item?.harga || item?.harga_jual || item?.price || item?.unit_price || 0);

    return sum + qty * harga;
  }, 0);
}

function getOrderSubtotal(order: any) {
  return getNumberValue(
    order?.subtotal,
    order?.sub_total,
    order?.items_subtotal,
    order?.item_total,
    order?.jumlah_item
  ) || getOrderItemsSubtotal(order);
}

function getOrderServiceChargeAmount(order: any) {
  const existing = getNumberValue(
    order?.service_charge_amount,
    order?.serviceChargeAmount,
    order?.service_charge,
    order?.serviceCharge,
    order?.caj_servis_amount,
    order?.caj_servis
  );

  if (existing > 0) return existing;

  const rate = getNumberValue(
    order?.service_charge_rate,
    order?.serviceChargeRate,
    order?.caj_servis_rate
  );

  if (!rate) return 0;

  return getOrderSubtotal(order) * (rate / 100);
}

function getOrderSstAmount(order: any) {
  const existing = getNumberValue(
    order?.sst_amount,
    order?.sstAmount,
    order?.tax_amount,
    order?.taxAmount,
    order?.cukai_amount
  );

  if (existing > 0) return existing;

  const rate = getNumberValue(
    order?.sst_rate,
    order?.sstRate,
    order?.tax_rate,
    order?.taxRate
  );

  if (!rate) return 0;

  return (getOrderSubtotal(order) + getOrderServiceChargeAmount(order)) * (rate / 100);
}

function getOrderTotal(order: any) {
  const existing = getNumberValue(
    order?.total,
    order?.jumlah,
    order?.jumlah_bayaran,
    order?.grand_total,
    order?.total_amount,
    order?.amount
  );

  if (existing > 0) return existing;

  return getOrderSubtotal(order) + getOrderServiceChargeAmount(order) + getOrderSstAmount(order);
}

function getPaymentMethod(order: any) {
  return order?.payment_method ||
    order?.paymentMethod ||
    order?.payment ||
    order?.bayaran ||
    order?.kaedah_bayaran ||
    order?.method ||
    null;
}

function isPaidSalesOrder(order: any) {
  const status = normalizeText(order?.status);
  const paymentStatus = normalizeText(order?.payment_status || order?.paymentStatus || order?.status_bayaran);
  const paymentMethod = normalizeText(getPaymentMethod(order));
  const total = getOrderTotal(order);

  if (total <= 0) return false;
  if (SALES_STATUSES.has(status)) return true;
  if (PAID_PAYMENT_STATUSES.has(paymentStatus)) return true;
  if (VALID_PAYMENT_METHODS.has(paymentMethod) && !NON_SALES_STATUSES.has(status)) return true;

  return false;
}

function getOrderSalesDate(order: any) {
  return order?.paid_at ||
    order?.paidAt ||
    order?.completed_at ||
    order?.completedAt ||
    order?.created_at ||
    order?.createdAt ||
    order?.updated_at ||
    order?.updatedAt ||
    null;
}

function isOrderInDateRange(order: any, from: string, to: string) {
  const rawDate = getOrderSalesDate(order);

  if (!rawDate) return true;

  const time = new Date(rawDate).getTime();

  if (Number.isNaN(time)) return true;

  return time >= new Date(from).getTime() && time <= new Date(to).getTime();
}

async function attachOrderItemsToOrders(rawOrders: any[]) {
  const orders = rawOrders || [];

  if (orders.length === 0) return [];

  const orderIds = orders.map((o: any) => o.id).filter(Boolean);

  if (orderIds.length === 0) {
    return orders.map((o: any) => ({
      ...o,
      order_items: o.order_items || []
    }));
  }

  const itemQueries = [
    supabase.from("order_items").select("*").in("order_id", orderIds),
    supabase.from("order_items").select("*").in("orderId", orderIds),
    supabase.from("order_items").select("*").in("orders_id", orderIds),
  ];

  let itemsData: any[] = [];

  for (const query of itemQueries) {
    const { data, error } = await query as any;

    if (!error && data) {
      itemsData = data;
      break;
    }
  }

  const itemMap: Record<string, any[]> = {};

  (itemsData || []).forEach((item: any) => {
    const orderId = item.order_id || item.orderId || item.orders_id;

    if (!orderId) return;

    if (!itemMap[orderId]) itemMap[orderId] = [];

    itemMap[orderId].push(item);
  });

  return orders.map((order: any) => ({
    ...order,
    order_items: order.order_items || itemMap[order.id] || []
  }));
}

export default function SuperadminDashboardPage() {
  const [kedaiList, setKedaiList] = useState<Kedai[]>([]);
  const [monthlyKedaiStats, setMonthlyKedaiStats] = useState<{ [id: string]: KedaiStats }>({});
  const [billingMap, setBillingMap] = useState<{ [kedai_id: string]: BillingRecord }>({});
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [updatingBilling, setUpdatingBilling] = useState<string | null>(null);
  const [confirmBilling, setConfirmBilling] = useState<{ kedaiId: string; nama: string; currentStatus: string } | null>(null);
  const [billingBulan, setBillingBulan] = useState(getCurrentBulan());
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<PendingStatusChange | null>(null);
  const [showPlanChange, setShowPlanChange] = useState<PendingPlanChange | null>(null);
  const [showAddKedai, setShowAddKedai] = useState(false);
  const [newKedaiNama, setNewKedaiNama] = useState("");
  const [newKedaiPlan, setNewKedaiPlan] = useState("beta");
  const [saving, setSaving] = useState(false);
  const [newKedaiOwnerNama, setNewKedaiOwnerNama] = useState("");
  const [newKedaiTelefon, setNewKedaiTelefon] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{ username: string; password: string; kedaiNama: string } | null>(null);
  const [activeTab, setActiveTab] = useState("utama");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [credentialsList, setCredentialsList] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  useEffect(() => {
    fetchKedai();
  }, []);

  useEffect(() => {
    if (activeTab === "langganan" && kedaiList.length > 0) fetchBilling();
  }, [activeTab, kedaiList, billingBulan, monthlyKedaiStats]);

  async function fetchKedai() {
    setLoading(true);

    const { data } = await supabase
      .from("kedai")
      .select("*")
      .order("created_at", { ascending: false });

    setKedaiList(data || []);

    if (data && data.length > 0) {
      await fetchMonthlyStats(data);
    }

    setLoading(false);
  }

  function createEmptyStatsMap(kedais: Kedai[]) {
    const statsMap: { [id: string]: KedaiStats } = {};

    kedais.forEach((kedai) => {
      statsMap[kedai.id] = {
        kedai_id: kedai.id,
        jualan: 0,
        fee: 0,
        staff: 0,
        serviceCharge: 0,
        sst: 0
      };
    });

    return statsMap;
  }

  async function buildStatsMap(kedais: Kedai[], from: string, to: string) {
    const statsMap = createEmptyStatsMap(kedais);

    try {
      const { data: rawOrders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000) as any;

      const ordersWithItems = await attachOrderItemsToOrders(rawOrders || []);

      const paidOrders = ordersWithItems
        .filter(isPaidSalesOrder)
        .filter((o: any) => isOrderInDateRange(o, from, to));

      paidOrders.forEach((order: any) => {
        const kedaiId = order.kedai_id || order.kedaiId || order.store_id || order.storeId;

        if (!kedaiId || !statsMap[kedaiId]) return;

        statsMap[kedaiId].jualan += getOrderTotal(order);
        statsMap[kedaiId].serviceCharge += getOrderServiceChargeAmount(order);
        statsMap[kedaiId].sst += getOrderSstAmount(order);
      });

      const { data: staffData } = await supabase
        .from("users")
        .select("id, kedai_id, role")
        .neq("role", "superadmin") as any;

      (staffData || []).forEach((user: any) => {
        const kedaiId = user.kedai_id || user.kedaiId;

        if (!kedaiId || !statsMap[kedaiId]) return;

        statsMap[kedaiId].staff += 1;
      });

      kedais.forEach((kedai) => {
        const jualan = statsMap[kedai.id]?.jualan || 0;

        statsMap[kedai.id] = {
          ...statsMap[kedai.id],
          jualan,
          fee: kedai.status === "beta" ? 0 : jualan * 0.02
        };
      });
    } catch (error) {
      console.error("buildStatsMap error:", error);
    }

    return statsMap;
  }

  async function fetchMonthlyStats(kedais: Kedai[]) {
    const monthlyRange = getMonthToDateRange();
    const monthlyStats = await buildStatsMap(kedais, monthlyRange.from, monthlyRange.to);

    setMonthlyKedaiStats(monthlyStats);
  }

  async function fetchBilling() {
    setLoadingBilling(true);

    const bulan = billingBulan;
    const isCurrentMonth = bulan === getCurrentBulan();

    const { data } = await supabase
      .from("billing")
      .select("*")
      .eq("bulan", bulan) as any;

    const map: { [kedai_id: string]: BillingRecord } = {};

    (data || []).forEach((record: BillingRecord) => {
      map[record.kedai_id] = record;
    });

    for (const record of (data || [])) {
      const kedai = kedaiList.find(k => k.id === record.kedai_id);

      if (kedai && kedai.status !== "active") {
        await supabase
          .from("billing")
          .delete()
          .eq("id", record.id);

        delete map[record.kedai_id];
      }
    }

    if (isCurrentMonth) {
      const activeKedai = kedaiList.filter(k => k.status === "active");

      for (const kedai of activeKedai) {
        if (!map[kedai.id]) {
          const s = monthlyKedaiStats[kedai.id];

          const { data: newRecord } = await supabase
            .from("billing")
            .insert({
              kedai_id: kedai.id,
              bulan,
              jualan: s?.jualan || 0,
              fee: s?.fee || 0,
              status: "unpaid"
            })
            .select()
            .single() as any;

          if (newRecord) map[kedai.id] = newRecord;
        } else {
          const s = monthlyKedaiStats[kedai.id];

          if (s) {
            await supabase
              .from("billing")
              .update({
                jualan: s.jualan,
                fee: s.fee
              })
              .eq("id", map[kedai.id].id);

            map[kedai.id] = {
              ...map[kedai.id],
              jualan: s.jualan,
              fee: s.fee
            };
          }
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

    await supabase
      .from("billing")
      .update({ status: newStatus })
      .eq("id", record.id);

    setBillingMap(prev => ({
      ...prev,
      [kedaiId]: {
        ...prev[kedaiId],
        status: newStatus
      }
    }));

    setUpdatingBilling(null);
  }

  function statusLabel(status: string) {
    if (status === "active") return "Aktif";
    if (status === "beta") return "Beta";
    if (status === "suspended") return "Suspended";

    return status;
  }

  function requestStatusChange(kedai: Kedai, targetStatus: string) {
    setConfirmStatusChange({
      id: kedai.id,
      nama: kedai.nama,
      currentStatus: kedai.status,
      targetStatus
    });
  }

  function requestPlanChange(targetStatus: string) {
    if (!showPlanChange) return;

    setConfirmStatusChange({
      id: showPlanChange.id,
      nama: showPlanChange.nama,
      currentStatus: showPlanChange.currentStatus,
      targetStatus
    });

    setShowPlanChange(null);
  }

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("kedai")
      .update({ status } as any)
      .eq("id", id);

    setConfirmStatusChange(null);
    fetchKedai();
  }

  async function deleteKedai(id: string) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("kedai_id", id) as any;

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);

      await supabase
        .from("order_items")
        .delete()
        .in("order_id", orderIds);

      await supabase
        .from("orders")
        .delete()
        .eq("kedai_id", id);
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

    const username = newKedaiNama
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) + Math.floor(Math.random() * 100);

    const password = Math.random().toString(36).slice(-8).toUpperCase();

    const { data: kedai } = await supabase
      .from("kedai")
      .insert({
        nama: newKedaiNama,
        status: newKedaiPlan,
        tema_warna: "#16a34a"
      } as any)
      .select()
      .single() as any;

    if (kedai) {
      await supabase
        .from("users")
        .insert({
          nama: newKedaiOwnerNama,
          username,
          role: "owner",
          is_active: true,
          kedai_id: kedai.id,
          password
        } as any);

      setGeneratedCreds({
        username,
        password,
        kedaiNama: newKedaiNama
      });
    }

    setNewKedaiNama("");
    setNewKedaiOwnerNama("");
    setNewKedaiTelefon("");
    setNewKedaiPlan("beta");
    setShowAddKedai(false);
    setSaving(false);
    fetchKedai();
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

  function bulanLabel() {
    const [y, m] = billingBulan.split("-");

    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("ms-MY", {
      month: "long",
      year: "numeric"
    });
  }

  function navigateBulan(direction: number) {
    const [y, m] = billingBulan.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);

    setBillingBulan(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setBillingMap({});
  }

  function isCurrentBulan() {
    return billingBulan === getCurrentBulan();
  }

  function formatRM(value: number) {
    return `RM ${Number(value || 0).toFixed(2)}`;
  }

  const monthlyKedaiStatsList = Object.values(monthlyKedaiStats) as KedaiStats[];
  const billingList = Object.values(billingMap) as BillingRecord[];

  const totalMonthlyJualan = monthlyKedaiStatsList.reduce((s, k) => s + k.jualan, 0);
  const totalMonthlyFee = monthlyKedaiStatsList.reduce((s, k) => s + k.fee, 0);

  const stats = {
    total: kedaiList.length,
    active: kedaiList.filter(k => k.status === "active").length,
    beta: kedaiList.filter(k => k.status === "beta").length,
    suspended: kedaiList.filter(k => k.status === "suspended").length
  };

  const billingPaid = billingList.filter(b => {
    const k = kedaiList.find(k => k.id === b.kedai_id);
    return b.status === "paid" && k?.status === "active";
  }).length;

  const billingUnpaid = billingList.filter(b => {
    const k = kedaiList.find(k => k.id === b.kedai_id);
    return b.status === "unpaid" && k?.status === "active";
  }).length;

  const totalFeePaid = billingList.filter(b => {
    const k = kedaiList.find(k => k.id === b.kedai_id);
    return b.status === "paid" && k?.status === "active";
  }).reduce((s, b) => s + Number(b.fee), 0);

  const totalFeeUnpaid = billingList.filter(b => {
    const k = kedaiList.find(k => k.id === b.kedai_id);
    return b.status === "unpaid" && k?.status === "active";
  }).reduce((s, b) => s + Number(b.fee), 0);

  const navItems = [
    { id: "utama", label: "Utama", icon: LayoutDashboard },
    { id: "klien", label: "Kedai", icon: Store },
    { id: "langganan", label: "Langganan", icon: CreditCard },
    { id: "laporan", label: "Laporan", icon: BarChart2 },
    { id: "tetapan", label: "Tetapan", icon: Settings },
  ];

  function handleChangeTab(tabId: string) {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  }

  const activeNav = navItems.find(n => n.id === activeTab);

  const SidebarMenu = ({ expanded, mobile = false }: { expanded: boolean; mobile?: boolean }) => {
    return (
      <>
        <div className={`${expanded ? "px-6" : "px-3"} py-5 flex items-center justify-between border-b border-gray-100`}>
          {expanded ? (
            <div className="min-w-0">
              <div className="text-gray-900 font-bold text-lg tracking-tight">
                Urus<span className="text-green-600">POS</span>
              </div>
              <div className="text-gray-400 text-xs font-medium tracking-widest uppercase mt-0.5">
                Superadmin
              </div>
            </div>
          ) : (
            <div className="w-full h-10" />
          )}

          {mobile && (
            <button
              onClick={() => setShowMobileMenu(false)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={`${expanded ? "px-4" : "px-3"} flex-1 py-4`}>
          {expanded && (
            <div className="text-gray-300 text-[10px] font-semibold tracking-widest uppercase px-2 mb-2">
              Menu
            </div>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  title={!expanded ? item.label : undefined}
                  onClick={() => handleChangeTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-sm font-medium transition-all ${
                    expanded ? "gap-3 px-3 py-3" : "justify-center px-0 py-3"
                  } ${
                    isActive
                      ? "text-green-700 bg-green-50"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className={isActive ? "text-green-600" : "text-gray-400"}
                  />
                  {expanded && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        <div className={`${expanded ? "px-4" : "px-3"} py-4 border-t border-gray-100`}>
          <a
            href="/auth/logout"
            title={!expanded ? "Log Keluar" : undefined}
            className={`flex items-center rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all ${
              expanded ? "gap-2 px-3 py-2.5" : "justify-center px-0 py-3"
            }`}
          >
            <LogOut size={16} strokeWidth={1.8} />
            {expanded && <span>Log Keluar</span>}
          </a>
        </div>
      </>
    );
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
    >
      <aside
        className={`hidden md:flex bg-white border-r border-gray-100 flex-col sticky top-0 h-screen transition-all duration-200 shrink-0 ${
          desktopSidebarExpanded ? "w-72" : "w-20"
        }`}
      >
        <SidebarMenu expanded={desktopSidebarExpanded} />
      </aside>

      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setShowMobileMenu(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative h-full w-72 bg-white shadow-xl flex flex-col animate-[slideInLeft_0.2s_ease-out]">
            <SidebarMenu expanded mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setDesktopSidebarExpanded(v => !v)}
              className="hidden md:flex w-9 h-9 items-center justify-center text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              <Menu size={20} />
            </button>

            <div className="text-gray-900 font-semibold text-sm">
              {activeNav?.label || "Utama"}
            </div>
          </div>

          <div className="text-gray-900 font-bold text-base tracking-tight">
            Urus<span className="text-green-600">POS</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">
          {activeTab === "utama" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Ringkasan</h1>
                  <p className="text-gray-400 text-sm mt-0.5">Semua kedai aktif</p>
                </div>
              </div>

              <div className="bg-green-600 rounded-2xl p-6 mb-4 text-white">
                <div className="text-green-100 text-sm font-medium">
                  Fee Terkumpul Bulan Ini
                </div>

                <div className="text-4xl font-bold mt-1 tracking-tight">
                  {formatRM(totalMonthlyFee)}
                </div>

                <div className="flex gap-4 mt-3 text-sm text-green-100">
                  <span>Jualan {formatRM(totalMonthlyJualan)}</span>
                  <span>·</span>
                  <span>{stats.active} kedai aktif</span>
                </div>
              </div>

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

          {activeTab === "klien" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Kedai</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{kedaiList.length} kedai berdaftar</p>
                </div>

                <button
                  onClick={() => setShowAddKedai(true)}
                  className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                >
                  <Plus size={15} />
                  <span className="hidden sm:inline">Kedai Baru</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 py-12 text-sm">Memuatkan...</div>
              ) : (
                <>
                  <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Kedai</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Staff</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tindakan</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-50">
                        {kedaiList.map((kedai) => {
                          const s = monthlyKedaiStats[kedai.id];

                          return (
                            <tr key={kedai.id} className="hover:bg-gray-50/70 transition-all">
                              <td className="px-5 py-4">
                                <div className="font-semibold text-gray-900">{kedai.nama}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Daftar {kedai.created_at ? new Date(kedai.created_at).toLocaleDateString("ms-MY") : "-"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-mono text-xs text-gray-400">{kedai.id.slice(0, 8)}...</span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-gray-600">{s?.staff || 0} staff</span>
                              </td>

                              <td className="px-5 py-4">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                  kedai.status === "active"
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : kedai.status === "beta"
                                      ? "bg-amber-50 text-amber-700 border-amber-100"
                                      : "bg-red-50 text-red-600 border-red-100"
                                }`}>
                                  {statusLabel(kedai.status)}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setShowPlanChange({
                                      id: kedai.id,
                                      nama: kedai.nama,
                                      currentStatus: kedai.status
                                    })}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition-all"
                                  >
                                    <Repeat2 size={12} />
                                    Tukar Plan
                                  </button>

                                  {kedai.status !== "suspended" && (
                                    <button
                                      onClick={() => requestStatusChange(kedai, "suspended")}
                                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                                    >
                                      Suspend
                                    </button>
                                  )}

                                  <button
                                    onClick={() => fetchCredentials(kedai.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all"
                                  >
                                    <Key size={12} />
                                    Credentials
                                  </button>

                                  <button
                                    onClick={() => setConfirmDelete(kedai.id)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {kedaiList.length === 0 && (
                      <div className="text-center text-gray-400 py-12 text-sm">Tiada kedai.</div>
                    )}
                  </div>

                  <div className="md:hidden flex flex-col gap-3">
                    {kedaiList.map((kedai) => {
                      const s = monthlyKedaiStats[kedai.id];

                      return (
                        <div key={kedai.id} className="bg-white rounded-xl p-5 border border-gray-100">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                              <div className="text-gray-900 font-semibold truncate">{kedai.nama}</div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-gray-400 text-xs">{kedai.id.slice(0, 8)}...</span>
                                <span className="text-gray-200 text-xs">·</span>
                                <span className="text-gray-400 text-xs">{s?.staff || 0} staff</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                kedai.status === "active"
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : kedai.status === "beta"
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : "bg-red-50 text-red-600 border-red-100"
                              }`}>
                                {statusLabel(kedai.status)}
                              </span>

                              <button
                                onClick={() => setConfirmDelete(kedai.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-50">
                            <button
                              onClick={() => setShowPlanChange({
                                id: kedai.id,
                                nama: kedai.nama,
                                currentStatus: kedai.status
                              })}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition-all flex items-center gap-1"
                            >
                              <Repeat2 size={12} />
                              Tukar Plan
                            </button>

                            {kedai.status !== "suspended" && (
                              <button
                                onClick={() => requestStatusChange(kedai, "suspended")}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all"
                              >
                                Suspend
                              </button>
                            )}

                            <button
                              onClick={() => fetchCredentials(kedai.id)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-1"
                            >
                              <Key size={12} />
                              Credentials
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {kedaiList.length === 0 && (
                      <div className="text-center text-gray-400 py-12 text-sm">Tiada kedai.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "langganan" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-gray-900 font-semibold text-xl">Langganan</h1>
                  <p className="text-gray-400 text-sm mt-0.5">Status bayaran bulanan</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateBulan(-1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="text-sm font-medium text-gray-700 min-w-[110px] text-center">
                    {bulanLabel()}
                  </div>

                  <button
                    onClick={() => navigateBulan(1)}
                    disabled={isCurrentBulan()}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

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
                  {kedaiList.filter((kedai) => {
                    const kedaiCreatedBulan = kedai.created_at
                      ? `${new Date(kedai.created_at).getFullYear()}-${String(new Date(kedai.created_at).getMonth() + 1).padStart(2, "0")}`
                      : "2000-01";

                    return billingBulan >= kedaiCreatedBulan;
                  }).map((kedai) => {
                    const s = monthlyKedaiStats[kedai.id];
                    const billing = billingMap[kedai.id];
                    const isActive = kedai.status === "active";
                    const isPaid = billing?.status === "paid";

                    return (
                      <div key={kedai.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 text-sm font-medium truncate">{kedai.nama}</div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              kedai.status === "active"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : kedai.status === "beta"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-red-50 text-red-600 border-red-100"
                            }`}>
                              {statusLabel(kedai.status)}
                            </span>

                            {isActive && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                isPaid
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-red-50 text-red-500 border-red-100"
                              }`}>
                                {isPaid ? "Dah Bayar" : "Belum Bayar"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-gray-900 text-sm font-semibold">
                              {isActive
                                ? formatRM(s?.fee || 0)
                                : kedai.status === "beta"
                                  ? <span className="text-amber-500 text-xs">Free</span>
                                  : <span className="text-gray-300">—</span>
                              }
                            </div>

                            {isActive && (
                              <div className="text-gray-400 text-xs">
                                Jualan {formatRM(s?.jualan || 0)}
                              </div>
                            )}
                          </div>

                          {isActive && (
                            <button
                              onClick={() => setConfirmBilling({
                                kedaiId: kedai.id,
                                nama: kedai.nama,
                                currentStatus: billing?.status || "unpaid"
                              })}
                              disabled={updatingBilling === kedai.id}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                                isPaid
                                  ? "bg-red-50 border-red-100 text-red-400 hover:bg-red-100"
                                  : "bg-green-50 border-green-100 text-green-600 hover:bg-green-100"
                              }`}
                            >
                              {updatingBilling === kedai.id
                                ? <span className="text-xs">...</span>
                                : isPaid
                                  ? <X size={14} />
                                  : <Check size={14} />
                              }
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

      {showPlanChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Tukar Plan Kedai</div>
            <p className="text-gray-500 text-sm mb-5">
              {showPlanChange.nama}
            </p>

            <div className="space-y-2 mb-5">
              <button
                onClick={() => requestPlanChange("beta")}
                disabled={showPlanChange.currentStatus === "beta"}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  showPlanChange.currentStatus === "beta"
                    ? "bg-amber-50 border-amber-200 text-amber-700 opacity-70"
                    : "bg-white border-gray-200 hover:bg-amber-50 hover:border-amber-200"
                }`}
              >
                <div className="text-sm font-semibold">Beta</div>
                <div className="text-xs text-gray-400 mt-0.5">Free / tiada fee bulanan</div>
              </button>

              <button
                onClick={() => requestPlanChange("active")}
                disabled={showPlanChange.currentStatus === "active"}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  showPlanChange.currentStatus === "active"
                    ? "bg-green-50 border-green-200 text-green-700 opacity-70"
                    : "bg-white border-gray-200 hover:bg-green-50 hover:border-green-200"
                }`}
              >
                <div className="text-sm font-semibold">Aktif</div>
                <div className="text-xs text-gray-400 mt-0.5">Caj 2% daripada jualan</div>
              </button>
            </div>

            <button
              onClick={() => setShowPlanChange(null)}
              className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {confirmBilling && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Tukar Status Bayaran</div>

            <p className="text-gray-500 text-sm mb-5">
              {confirmBilling.nama} — {confirmBilling.currentStatus === "paid"
                ? "Dah Bayar → Belum Bayar"
                : "Belum Bayar → Dah Bayar"}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmBilling(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Batal
              </button>

              <button
                onClick={() => {
                  toggleBillingStatus(confirmBilling.kedaiId);
                  setConfirmBilling(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium ${
                  confirmBilling.currentStatus === "paid" ? "bg-red-500" : "bg-green-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStatusChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Tukar Status Kedai</div>

            <p className="text-gray-500 text-sm mb-1">
              {confirmStatusChange.nama}
            </p>

            <p className="text-gray-400 text-sm mb-5">
              {statusLabel(confirmStatusChange.currentStatus)} → {statusLabel(confirmStatusChange.targetStatus)}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmStatusChange(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Batal
              </button>

              <button
                onClick={() => updateStatus(confirmStatusChange.id, confirmStatusChange.targetStatus)}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium ${
                  confirmStatusChange.targetStatus === "suspended"
                    ? "bg-red-500"
                    : confirmStatusChange.targetStatus === "beta"
                      ? "bg-amber-500"
                      : "bg-green-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Buang Kedai?</div>
            <p className="text-gray-500 text-sm mb-5">Tindakan ini tidak boleh dibatalkan.</p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Batal
              </button>

              <button
                onClick={() => deleteKedai(confirmDelete)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium"
              >
                Buang
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddKedai && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-gray-900 font-semibold">Tambah Kedai Baru</div>

              <button
                onClick={() => setShowAddKedai(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-gray-500 text-xs font-medium mb-1 block">NAMA KEDAI</label>
              <input
                type="text"
                value={newKedaiNama}
                onChange={(e) => setNewKedaiNama(e.target.value)}
                placeholder="cth: Kedai Makan Pak Ali"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-500 text-xs font-medium mb-1 block">NAMA OWNER</label>
              <input
                type="text"
                value={newKedaiOwnerNama}
                onChange={(e) => setNewKedaiOwnerNama(e.target.value)}
                placeholder="cth: Encik Ali bin Ahmad"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-500 text-xs font-medium mb-1 block">NO TELEFON (OPTIONAL)</label>
              <input
                type="text"
                value={newKedaiTelefon}
                onChange={(e) => setNewKedaiTelefon(e.target.value)}
                placeholder="cth: 0123456789"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-400"
              />
            </div>

            <div className="mb-5">
              <label className="text-gray-500 text-xs font-medium mb-2 block">PLAN</label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewKedaiPlan("beta")}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                    newKedaiPlan === "beta"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  Beta
                  <div className="text-xs font-normal mt-0.5 opacity-70">Free 2 bulan</div>
                </button>

                <button
                  onClick={() => setNewKedaiPlan("active")}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                    newKedaiPlan === "active"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  Aktif
                  <div className="text-xs font-normal mt-0.5 opacity-70">2% jualan</div>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddKedai(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Batal
              </button>

              <button
                onClick={addKedai}
                disabled={saving || !newKedaiNama.trim() || !newKedaiOwnerNama.trim()}
                className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Cipta Kedai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatedCreds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl">
            <div className="text-gray-900 font-semibold mb-1">Kedai Berjaya Dicipta</div>
            <p className="text-gray-500 text-sm mb-5">Hantar credentials ini kepada owner.</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Kedai</span>
                <span className="text-gray-900 font-medium">{generatedCreds.kedaiNama}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Username</span>
                <span className="text-gray-900 font-mono font-medium">{generatedCreds.username}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Password</span>
                <span className="text-gray-900 font-mono font-medium">{generatedCreds.password}</span>
              </div>
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(`Selamat datang ke UrusPOS!\nKedai: ${generatedCreds.kedaiNama}\nUsername: ${generatedCreds.username}\nPassword: ${generatedCreds.password}\nLogin: uruspos.vercel.app`)}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium mb-2"
            >
              Copy Mesej WhatsApp
            </button>

            <button
              onClick={() => setGeneratedCreds(null)}
              className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {showCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-xl"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-gray-900 font-semibold">Credentials</div>

              <button
                onClick={() => setShowCredentials(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCreds ? (
              <div className="text-center text-gray-400 py-6 text-sm">Memuatkan...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {credentialsList.map((user, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-900 text-sm font-medium">{user.nama}</span>

                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        user.role === "owner"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : user.role === "staff"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-orange-50 text-orange-700 border-orange-100"
                      }`}>
                        {user.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Username</span>
                        <span className="text-gray-900 font-mono">{user.username}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Password</span>
                        <span className="text-gray-900 font-mono">{user.password || "abc123"}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className={user.is_active ? "text-green-600" : "text-red-500"}>
                          {user.is_active ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {credentialsList.length === 0 && (
                  <div className="text-center text-gray-400 py-6 text-sm">Tiada user.</div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowCredentials(null)}
              className="w-full mt-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }

          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}