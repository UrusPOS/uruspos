"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { parseSessionCookie } from "@/lib/auth/session";
import {
  LayoutDashboard,
  Package,
  BarChart2,
  Users,
  Settings,
  DollarSign,
  Flame,
  List,
  TrendingUp,
  TrendingDown,
  Box,
  History,
  Receipt,
  X,
  Menu,
  LogOut,
  ChevronDown,
  Calendar,
  Check,
  Clock,
  AlertTriangle,
  Utensils,
  Coffee,
  Tag,
  Pause,
  Play,
  Trash2,
  Pencil,
  Search,
  CreditCard,
  FileText,
  User,
  Lock,
  Monitor,
  Star,
  Key,
  Plus,
  Minus,
  ShoppingCart,
} from "lucide-react";

// Safe icon aliases — replaces lucide icons that may not exist in older versions
const FolderTree = List;
const ClipboardList = List;
const Armchair = LayoutDashboard;
const Store = LayoutDashboard;
const BadgePercent = Tag;
const Palette = Settings;
const LockKeyhole = Lock;
const CalendarDays = Calendar;
const CircleCheck = Check;
const Clock3 = Clock;
const Ban = X;
const CupSoda = Coffee;
const CakeSlice = Star;
const Soup = Coffee;
const Drumstick = Utensils;
const Sandwich = Utensils;
const BoxOpen = Package;
const UserRound = User;
const UserCog = User;
const ChefHat = User;
const ImageIcon = Monitor;
const Smartphone = Monitor;
const Sun = Star;
const Moon = Star;
const KeyRound = Key;
const Lightbulb = Star;

type StaffMember = {
  id: string;
  nama: string;
  username: string;
  role: string;
  is_active: boolean;
};

type Produk = {
  id: string;
  kod_produk?: string | null;
  nama: string;
  harga_jual: number;
  kos_produk: number;
  stok: number;
  is_active: boolean;
  kategori_id?: string | null;
  kategori_nama?: string | null;
  kategori_icon?: string | null;
};

type ProductCategory = {
  id: string;
  kedai_id: string;
  nama: string;
  icon: string;
  sort_order: number;
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

type StockMovementRecord = {
  id: string;
  produk_id?: string | null;
  produk_nama: string;
  type: "in" | "out" | "adjustment" | "sold" | string;
  qty: number;
  reason?: string | null;
  source?: string | null;
  order_id?: string | null;
  created_at: string;
  created_by?: string | null;
};

type InventorySummaryItem = {
  id: string;
  nama: string;
  stokAwal: number;
  stockIn: number;
  stockOut: number;
  stokAkhir: number;
};

type PaymentSummaryItem = {
  method: string;
  total: number;
  count: number;
};

type SalesTrendItem = {
  label: string;
  total: number;
  profit: number;
  orders: number;
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
  subtotal: number;
  service_charge_enabled?: boolean | null;
  service_charge_rate?: number | null;
  service_charge_amount?: number | null;
  sst_enabled?: boolean | null;
  sst_rate?: number | null;
  sst_amount?: number | null;
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
  inventorySummary: InventorySummaryItem[];
  stockMovements: StockMovementRecord[];
  stockInTotal: number;
  stockOutTotal: number;
  paymentSummary: PaymentSummaryItem[];
  recentReceipts: RecentReceipt[];
  todayReceipts: RecentReceipt[];
  salesTrend: SalesTrendItem[];
  last30DaysSales: SalesTrendItem[];
};

type FilterType = "daily" | "yesterday" | "weekly" | "monthly" | "custom";

const RECORDS_PER_PAGE = 20;

function getDateRange(
  filter: FilterType,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  if (filter === "daily") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "yesterday") {
    const from = new Date(now);
    from.setDate(now.getDate() - 1);
    from.setHours(0, 0, 0, 0);
    const yesterdayTo = new Date(now);
    yesterdayTo.setDate(now.getDate() - 1);
    yesterdayTo.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: yesterdayTo.toISOString() };
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
    const sessionCookie = cookies.find((c) =>
      c.trim().startsWith("uruspos_session="),
    );
    const sessionValue = sessionCookie?.split("=")?.[1];
    if (!sessionValue) return null;
    const parsedSession = parseSessionCookie(sessionValue);
    if (parsedSession) return parsedSession;
    return JSON.parse(decodeURIComponent(sessionValue));
  } catch {
    return null;
  }
}

const DEFAULT_PRODUCT_CATEGORIES = [
  { nama: "Makanan", icon: "food", sort_order: 1 },
  { nama: "Minuman", icon: "drink", sort_order: 2 },
  { nama: "Kuih Muih", icon: "dessert", sort_order: 3 },
  { nama: "Set / Combo", icon: "combo", sort_order: 4 },
  { nama: "Add-on", icon: "addon", sort_order: 5 },
  { nama: "Lain-lain", icon: "other", sort_order: 6 },
];

const CATEGORY_ICON_OPTIONS = [
  { id: "food", label: "Makanan", icon: Utensils },
  { id: "drink", label: "Minuman", icon: CupSoda },
  { id: "dessert", label: "Kuih", icon: CakeSlice },
  { id: "combo", label: "Set", icon: Package },
  { id: "addon", label: "Add-on", icon: Plus },
  { id: "other", label: "Lain-lain", icon: Box },
  { id: "coffee", label: "Kopi", icon: Coffee },
  { id: "noodle", label: "Mi", icon: Soup },
  { id: "chicken", label: "Ayam", icon: Drumstick },
  { id: "burger", label: "Burger", icon: Sandwich },
];

const CATEGORY_ICON_MAP: Record<string, any> = {
  food: Utensils,
  drink: CupSoda,
  dessert: CakeSlice,
  combo: Package,
  addon: Plus,
  other: Box,
  coffee: Coffee,
  noodle: Soup,
  chicken: Drumstick,
  burger: Sandwich,
};

function CategoryIcon({
  value,
  size = 16,
  className = "",
  strokeWidth = 2,
}: {
  value?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = CATEGORY_ICON_MAP[value || ""] || Box;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}

function isSuccessMessage(message: string) {
  const lower = String(message || "").toLowerCase();
  return (
    lower.includes("berjaya") ||
    lower.includes("disimpan") ||
    lower.includes("settle") ||
    lower.includes("sukses")
  );
}

function getCategoryFallback() {
  return { id: "", nama: "Lain-lain", icon: "other" };
}

const SALES_STATUSES = new Set([
  "paid",
  "done",
  "completed",
  "complete",
  "selesai",
  "closed",
  "settled",
]);
const NON_SALES_STATUSES = new Set([
  "pending",
  "new",
  "draft",
  "cancelled",
  "canceled",
  "void",
  "refund",
  "refunded",
  "unpaid",
]);
const PAID_PAYMENT_STATUSES = new Set([
  "paid",
  "completed",
  "complete",
  "success",
  "successful",
  "settled",
  "selesai",
]);
const VALID_PAYMENT_METHODS = new Set([
  "cash",
  "tunai",
  "duitnow",
  "qr",
  "qrcode",
  "qr code",
  "online",
  "transfer",
  "bank_transfer",
  "bank transfer",
  "card",
  "kad",
]);

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getOrderTotal(order: any) {
  const possibleTotals = [
    order?.total,
    order?.jumlah,
    order?.jumlah_bayaran,
    order?.grand_total,
    order?.total_amount,
    order?.amount,
    order?.subtotal,
  ];

  for (const value of possibleTotals) {
    const numberValue = Number(value);
    if (!Number.isNaN(numberValue) && numberValue > 0) return numberValue;
  }

  return (order?.order_items || []).reduce((sum: number, item: any) => {
    const qty = Number(item?.qty || item?.quantity || 0);
    const harga = Number(
      item?.harga || item?.harga_jual || item?.price || item?.unit_price || 0,
    );
    return sum + qty * harga;
  }, 0);
}

function getOrderCogs(order: any) {
  return (order?.order_items || []).reduce((sum: number, item: any) => {
    const qty = Number(item?.qty || item?.quantity || 0);
    const kos = Number(item?.kos || item?.kos_produk || item?.cost || 0);
    return sum + qty * kos;
  }, 0);
}

function getOrderGrossProfit(order: any) {
  return Math.max(getOrderTotal(order) - getOrderCogs(order), 0);
}

function getPaymentMethod(order: any) {
  return (
    order?.payment_method ||
    order?.paymentMethod ||
    order?.payment ||
    order?.bayaran ||
    order?.kaedah_bayaran ||
    order?.method ||
    null
  );
}

function isPaidSalesOrder(order: any) {
  const status = normalizeText(order?.status);
  const paymentStatus = normalizeText(
    order?.payment_status || order?.paymentStatus || order?.status_bayaran,
  );
  const paymentMethod = normalizeText(getPaymentMethod(order));
  const total = getOrderTotal(order);

  if (total <= 0) return false;
  if (SALES_STATUSES.has(status)) return true;
  if (PAID_PAYMENT_STATUSES.has(paymentStatus)) return true;
  if (
    VALID_PAYMENT_METHODS.has(paymentMethod) &&
    !NON_SALES_STATUSES.has(status)
  )
    return true;

  return false;
}

function getOrderSalesDate(order: any) {
  // Untuk report jualan historical, jangan guna updated_at sebelum created_at.
  // updated_at boleh berubah bila order disentuh semula, lalu jualan semalam nampak macam jualan hari ini.
  // Bila staff checkout nanti simpan paid_at, field itu tetap jadi priority utama.
  return (
    order?.paid_at ||
    order?.paidAt ||
    order?.completed_at ||
    order?.completedAt ||
    order?.created_at ||
    order?.createdAt ||
    order?.updated_at ||
    order?.updatedAt ||
    null
  );
}

function isOrderInDateRange(order: any, from: string, to: string) {
  const rawDate = getOrderSalesDate(order);
  if (!rawDate) return true;
  const time = new Date(rawDate).getTime();
  if (Number.isNaN(time)) return true;
  return time >= new Date(from).getTime() && time <= new Date(to).getTime();
}

function buildSalesTrendData(
  orders: any[],
  filter: FilterType,
  from: string,
  to: string,
): SalesTrendItem[] {
  const buckets: Record<string, SalesTrendItem> = {};
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(
    1,
    Math.ceil((toDate.getTime() - fromDate.getTime()) / dayMs),
  );

  if (filter === "daily" || filter === "yesterday" || totalDays <= 1) {
    const hourBuckets = ["00", "04", "08", "12", "16", "20"];
    hourBuckets.forEach((hour) => {
      buckets[hour] = { label: hour, total: 0, profit: 0, orders: 0 };
    });

    (orders || []).forEach((order) => {
      const rawDate = getOrderSalesDate(order);
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;
      const bucketHour = String(Math.floor(date.getHours() / 4) * 4).padStart(
        2,
        "0",
      );
      if (!buckets[bucketHour])
        buckets[bucketHour] = {
          label: bucketHour,
          total: 0,
          profit: 0,
          orders: 0,
        };
      buckets[bucketHour].total += getOrderTotal(order);
      buckets[bucketHour].profit += getOrderGrossProfit(order);
      buckets[bucketHour].orders += 1;
    });

    return hourBuckets.map((hour) => buckets[hour]);
  }

  const maxBuckets = 7;
  const stepDays = Math.max(1, Math.ceil(totalDays / maxBuckets));
  const bucketStarts: Date[] = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= toDate && bucketStarts.length < maxBuckets) {
    bucketStarts.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + stepDays);
  }

  bucketStarts.forEach((start) => {
    const label = start.toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
    });
    buckets[label] = { label, total: 0, profit: 0, orders: 0 };
  });

  (orders || []).forEach((order) => {
    const rawDate = getOrderSalesDate(order);
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;

    let selectedStart = bucketStarts[0];
    for (const start of bucketStarts) {
      if (date >= start) selectedStart = start;
    }

    const label = selectedStart.toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
    });
    if (!buckets[label])
      buckets[label] = { label, total: 0, profit: 0, orders: 0 };
    buckets[label].total += getOrderTotal(order);
    buckets[label].profit += getOrderGrossProfit(order);
    buckets[label].orders += 1;
  });

  return bucketStarts.map((start) => {
    const label = start.toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
    });
    return buckets[label];
  });
}

function buildLast30DaysSalesData(orders: any[]): SalesTrendItem[] {
  const buckets: Record<string, SalesTrendItem> = {};
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const bucketDates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const current = new Date(cursor);
    bucketDates.push(current);
    const key = current.toISOString().slice(0, 10);
    buckets[key] = {
      label: current.toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "short",
      }),
      total: 0,
      profit: 0,
      orders: 0,
    };
    cursor.setDate(cursor.getDate() + 1);
  }

  (orders || []).forEach((order) => {
    const rawDate = getOrderSalesDate(order);
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    if (date < start || date > today) return;

    const key = date.toISOString().slice(0, 10);
    if (!buckets[key]) return;
    buckets[key].total += getOrderTotal(order);
    buckets[key].profit += getOrderGrossProfit(order);
    buckets[key].orders += 1;
  });

  return bucketDates.map((date) => buckets[date.toISOString().slice(0, 10)]);
}

function mapOrderToReceipt(order: any): RecentReceipt {
  return {
    id: order.id,
    created_at: getOrderSalesDate(order) || order.created_at,
    meja: order.meja || order.table_no || order.tableNo || null,
    status: order.status,
    subtotal: Number(order.subtotal || 0),
    service_charge_enabled: Boolean(
      order.service_charge_enabled ||
      Number(order.service_charge_amount || 0) > 0,
    ),
    service_charge_rate: Number(order.service_charge_rate || 0),
    service_charge_amount: Number(order.service_charge_amount || 0),
    sst_enabled: Boolean(
      order.sst_enabled || Number(order.sst_amount || 0) > 0,
    ),
    sst_rate: Number(order.sst_rate || 0),
    sst_amount: Number(order.sst_amount || 0),
    total: getOrderTotal(order),
    payment_method: getPaymentMethod(order),
    order_items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      nama: item.nama || item.product_name || item.nama_produk || "Menu",
      qty: Number(item.qty || item.quantity || 0),
      harga: Number(
        item.harga || item.harga_jual || item.price || item.unit_price || 0,
      ),
      kos: Number(item.kos || item.kos_produk || item.cost || 0),
      nota: item.nota || item.note || null,
    })),
  };
}

function normalizeStockMovementType(value: any) {
  const type = normalizeText(value);
  if (["in", "masuk", "restock", "tambah", "receipt"].includes(type))
    return "in";
  if (["out", "keluar", "tolak", "sold", "sale", "sales"].includes(type))
    return "out";
  return type || "adjustment";
}

function isStockInMovement(type: any) {
  return normalizeStockMovementType(type) === "in";
}

function isStockOutMovement(type: any) {
  const normalized = normalizeStockMovementType(type);
  return normalized === "out" || normalized === "sold";
}

async function attachOrderItemsToOrders(rawOrders: any[]) {
  const orders = rawOrders || [];
  if (orders.length === 0) return [];

  const orderIds = orders.map((order: any) => order.id).filter(Boolean);
  if (orderIds.length === 0)
    return orders.map((order: any) => ({
      ...order,
      order_items: order.order_items || [],
    }));

  const itemQueries = [
    supabase.from("order_items").select("*").in("order_id", orderIds),
    supabase.from("order_items").select("*").in("orderId", orderIds),
    supabase.from("order_items").select("*").in("orders_id", orderIds),
  ];

  let itemsData: any[] = [];
  for (const query of itemQueries) {
    const { data, error } = (await query) as any;
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
    order_items: order.order_items || itemMap[order.id] || [],
  }));
}

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [showReportSubmenu, setShowReportSubmenu] = useState(false);
  const [showInventorySubmenu, setShowInventorySubmenu] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddProduk, setShowAddProduk] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [confirmDeleteProdukId, setConfirmDeleteProdukId] = useState<
    string | null
  >(null);
  const [confirmDeleteProdukNama, setConfirmDeleteProdukNama] = useState("");
  const [newStaffNama, setNewStaffNama] = useState("");
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");
  const [produkNama, setProdukNama] = useState("");
  const [produkHarga, setProdukHarga] = useState("");
  const [produkKos, setProdukKos] = useState("");
  const [produkStok, setProdukStok] = useState("");
  const [produkKategoriId, setProdukKategoriId] = useState("");
  const [categoryNama, setCategoryNama] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("food");
  const [categoryError, setCategoryError] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryNama, setEditCategoryNama] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("food");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [showCategoryFilterDropdown, setShowCategoryFilterDropdown] =
    useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editProdukId, setEditProdukId] = useState<string | null>(null);
  const [editProdukNama, setEditProdukNama] = useState("");
  const [editProdukHarga, setEditProdukHarga] = useState("");
  const [editProdukKos, setEditProdukKos] = useState("");
  const [editProdukKategoriId, setEditProdukKategoriId] = useState("");
  const [editStokSemasa, setEditStokSemasa] = useState(0);
  const [editStokMode, setEditStokMode] = useState<"tambah" | "tolak">(
    "tambah",
  );
  const [editStokQty, setEditStokQty] = useState("");
  const [editStokReason, setEditStokReason] = useState("");
  const [editStokError, setEditStokError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [kedaiInfo, setKedaiInfo] = useState<{
    nama: string;
    status: string;
    table_count?: number | null;
    logo_url?: string | null;
    duitnow_qr_url?: string | null;
    accent_color?: string | null;
    theme_mode?: string | null;
    sst_enabled?: boolean | null;
    sst_rate?: number | null;
    service_charge_enabled?: boolean | null;
    service_charge_rate?: number | null;
  } | null>(null);

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
    inventorySummary: [],
    stockMovements: [],
    stockInTotal: 0,
    stockOutTotal: 0,
    paymentSummary: [],
    recentReceipts: [],
    todayReceipts: [],
    salesTrend: [],
    last30DaysSales: [],
  });
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RecentReceipt | null>(
    null,
  );
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
  const [storeSetupMsg, setStoreSetupMsg] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [selectedAccentColor, setSelectedAccentColor] = useState("green");
  const [selectedThemeMode, setSelectedThemeMode] = useState("light");
  const [themeMsg, setThemeMsg] = useState("");
  const [chargeMsg, setChargeMsg] = useState("");
  const [sstEnabled, setSstEnabled] = useState(false);
  const [sstRate, setSstRate] = useState("0");
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargeRate, setServiceChargeRate] = useState("0");
  const [billingStatus, setBillingStatus] = useState<{
    status: string;
    fee: number;
    jualan: number;
    bulanLabel: string;
  } | null>(null);
  const [urusposFeeEstimate, setUrusposFeeEstimate] = useState({
    monthToDateSales: 0,
    fee: 0,
    monthLabel: "",
    dueDateLabel: "",
  });

  const [filter, setFilter] = useState<FilterType>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<FilterType>("custom");
  const [pendingCustomFrom, setPendingCustomFrom] = useState("");
  const [pendingCustomTo, setPendingCustomTo] = useState("");
  const [activeReportTab, setActiveReportTab] = useState("sales-summary");
  const [activeInventoryTab, setActiveInventoryTab] = useState("inventory");
  const [recordsPage, setRecordsPage] = useState(1);
  const [activeSettingsTab, setActiveSettingsTab] = useState("table-setup");

  // useEffect 1 — fetch session & kedai info
  useEffect(() => {
    fetchSessionAndKedai();
  }, [activeTab]);

  // useEffect 2 — fetch data bila filter berubah
  useEffect(() => {
    if (sessionUser?.kedai_id) {
      fetchAllData(sessionUser.kedai_id);
    }
  }, [sessionUser?.kedai_id, filter, customFrom, customTo]);

  useEffect(() => {
    setRecordsPage(1);
  }, [activeInventoryTab, filter, customFrom, customTo, reportData.stockMovements.length]);

  async function fetchSessionAndKedai() {
    const session = getCookieSession();
    let resolvedKedaiId = session?.kedai_id || null;

    if (!resolvedKedaiId && session?.id) {
      const { data: userData } = (await supabase
        .from("users")
        .select("kedai_id")
        .eq("id", session.id)
        .single()) as any;
      resolvedKedaiId = userData?.kedai_id || null;
    }
    if (!resolvedKedaiId && session?.username) {
      const { data: userData } = (await supabase
        .from("users")
        .select("kedai_id")
        .eq("username", session.username)
        .single()) as any;
      resolvedKedaiId = userData?.kedai_id || null;
    }

    const resolvedSession = { ...(session || {}), kedai_id: resolvedKedaiId };
    setSessionUser(resolvedSession);

    if (resolvedKedaiId) {
      const { data, error } = (await supabase
        .from("kedai")
        .select(
          "nama, status, table_count, logo_url, duitnow_qr_url, accent_color, theme_mode, sst_enabled, sst_rate, service_charge_enabled, service_charge_rate",
        )
        .eq("id", resolvedKedaiId)
        .single()) as any;
      let kedaiData = data || null;
      if (error) {
        const fallback = (await supabase
          .from("kedai")
          .select(
            "nama, status, logo_url, duitnow_qr_url, accent_color, theme_mode, sst_enabled, sst_rate, service_charge_enabled, service_charge_rate",
          )
          .eq("id", resolvedKedaiId)
          .single()) as any;
        kedaiData = fallback.data ? { ...fallback.data, table_count: 6 } : null;
      }
      setKedaiInfo(kedaiData);
      setTableCountInput(
        Math.min(Math.max(Number(kedaiData?.table_count || 6), 1), 20),
      );
      setSelectedAccentColor(kedaiData?.accent_color || "green");
      setSelectedThemeMode(kedaiData?.theme_mode || "light");
      setSstEnabled(Boolean(kedaiData?.sst_enabled));
      setSstRate(String(Number(kedaiData?.sst_rate || 0)));
      setServiceChargeEnabled(Boolean(kedaiData?.service_charge_enabled));
      setServiceChargeRate(String(Number(kedaiData?.service_charge_rate || 0)));

      fetchAllData(resolvedKedaiId);
      fetchBillingStatus(resolvedKedaiId);
      fetchStaff(resolvedKedaiId);
      fetchCategories(resolvedKedaiId);

      if (activeTab === "inventory") fetchProduk(resolvedKedaiId);
    } else {
      setKedaiInfo(null);
    }
  }

  async function fetchAllData(kedaiId: string) {
    if (!kedaiId) return;

    setLoadingStats(true);
    if (activeTab === "laporan") setLoadingReport(true);

    const { from, to } = getDateRange(filter, customFrom, customTo);

    try {
      // Jangan guna embedded select "order_items(*)" di sini.
      // Kalau relationship Supabase belum proper, embedded select akan gagal dan dashboard jadi 0.
      // Kita ambil orders dahulu, kemudian attach order_items secara berasingan.
      const { data: rawOrdersData, error: ordersError } = (await supabase
        .from("orders")
        .select("*")
        .eq("kedai_id", kedaiId)
        .order("created_at", { ascending: false })
        .limit(1000)) as any;

      if (ordersError) {
        console.error("Owner dashboard orders query error:", ordersError);
      }

      const ordersWithItems = await attachOrderItemsToOrders(
        rawOrdersData || [],
      );

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthToDateEnd = new Date();
      monthToDateEnd.setHours(23, 59, 59, 999);
      const monthEnd = new Date(
        monthToDateEnd.getFullYear(),
        monthToDateEnd.getMonth() + 1,
        0,
      );

      const allPaidOrders = (ordersWithItems || []).filter(isPaidSalesOrder);

      const monthToDateOrders = allPaidOrders.filter((order: any) =>
        isOrderInDateRange(
          order,
          monthStart.toISOString(),
          monthToDateEnd.toISOString(),
        ),
      );
      const monthToDateSales = monthToDateOrders.reduce(
        (sum: number, order: any) => sum + getOrderTotal(order),
        0,
      );

      setUrusposFeeEstimate({
        monthToDateSales,
        fee: monthToDateSales * 0.02,
        monthLabel: monthStart.toLocaleDateString("ms-MY", {
          month: "long",
          year: "numeric",
        }),
        dueDateLabel: monthEnd.toLocaleDateString("ms-MY", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });

      const { data: stokRendah } = (await supabase
        .from("produk")
        .select("id")
        .eq("kedai_id", kedaiId)
        .lte("stok", 5)
        .eq("is_active", true)) as any;

      const { data: produkData } = (await supabase
        .from("produk")
        .select("id, nama, stok")
        .eq("kedai_id", kedaiId)
        .eq("is_active", true)
        .order("stok", { ascending: true })) as any;

      let stockMovementsData: StockMovementRecord[] = [];
      const { data: rawStockMovements, error: stockMovementsError } =
        (await supabase
          .from("stock_movements")
          .select("*")
          .eq("kedai_id", kedaiId)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: false })
          .limit(50)) as any;

      if (stockMovementsError) {
        console.warn(
          "Owner dashboard stock_movements query skipped:",
          stockMovementsError.message || stockMovementsError,
        );
      } else {
        stockMovementsData = (rawStockMovements || []).map((item: any) => ({
          id: item.id,
          produk_id: item.produk_id || item.product_id || null,
          produk_nama:
            item.produk_nama || item.product_name || item.nama_produk || "Menu",
          type: normalizeStockMovementType(item.type),
          qty: Number(item.qty || item.quantity || 0),
          reason: item.reason || item.sebab || null,
          source: item.source || null,
          order_id: item.order_id || null,
          created_at: item.created_at,
          created_by: item.created_by || null,
        }));
      }

      const paidOrders = allPaidOrders.filter((order: any) =>
        isOrderInDateRange(order, from, to),
      );

      const todayRange = getDateRange("daily");
      const todayPaidOrders = allPaidOrders.filter((order: any) =>
        isOrderInDateRange(order, todayRange.from, todayRange.to),
      );

      const jumlahJualan = paidOrders.reduce(
        (s: number, o: any) => s + getOrderTotal(o),
        0,
      );
      const jumlahTransaksi = paidOrders.length;

      let jumlahCOGS = 0;
      paidOrders.forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          const qty = Number(item.qty || item.quantity || 0);
          const kos = Number(item.kos || item.kos_produk || item.cost || 0);
          jumlahCOGS += kos * qty;
        });
      });

      const jumlahUntung = jumlahJualan - jumlahCOGS;
      const jumlahMargin =
        jumlahJualan > 0 ? Math.round((jumlahUntung / jumlahJualan) * 100) : 0;

      setStats({
        jumlahJualan,
        jumlahTransaksi,
        jumlahCOGS,
        jumlahUntung,
        jumlahMargin,
        stokKritikal: stokRendah?.length || 0,
      });

      if (
        activeTab === "laporan" ||
        activeTab === "dashboard" ||
        activeTab === "inventory"
      ) {
        const dineInOrders = paidOrders.filter((o: any) => {
          const meja = String(
            o.meja || o.table_no || o.tableNo || "",
          ).toLowerCase();
          return (
            meja &&
            !meja.includes("bungkus") &&
            !meja.includes("takeaway") &&
            !meja.includes("pickup")
          );
        }).length;

        const takeawayOrders = paidOrders.filter((o: any) => {
          const meja = String(
            o.meja || o.table_no || o.tableNo || "",
          ).toLowerCase();
          return (
            meja.includes("bungkus") ||
            meja.includes("takeaway") ||
            meja.includes("pickup")
          );
        }).length;

        const productMap: Record<string, ReportTopProduct> = {};
        const paymentMap: Record<string, PaymentSummaryItem> = {};

        paidOrders.forEach((order: any) => {
          const pm = String(getPaymentMethod(order) || "Belum direkod");
          if (!paymentMap[pm])
            paymentMap[pm] = { method: pm, total: 0, count: 0 };
          paymentMap[pm].total += getOrderTotal(order);
          paymentMap[pm].count += 1;

          (order.order_items || []).forEach((item: any) => {
            const nama =
              item.nama || item.product_name || item.nama_produk || "Menu";
            const qty = Number(item.qty || item.quantity || 0);
            const harga = Number(
              item.harga ||
                item.harga_jual ||
                item.price ||
                item.unit_price ||
                0,
            );
            if (!productMap[nama])
              productMap[nama] = { nama, qty: 0, total: 0 };
            productMap[nama].qty += qty;
            productMap[nama].total += harga * qty;
          });
        });

        const topProducts = Object.values(productMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);
        const paymentSummary = Object.values(paymentMap).sort(
          (a, b) => b.total - a.total,
        );
        const inventoryReport = (produkData || [])
          .slice(0, 6)
          .map((item: any) => ({
            id: item.id,
            nama: item.nama,
            stok: Number(item.stok || 0),
            status:
              Number(item.stok || 0) <= 0
                ? "Habis"
                : Number(item.stok || 0) <= 5
                  ? "Rendah"
                  : "Cukup",
          })) as InventoryReportItem[];

        const existingAutoOrderIds = new Set(
          stockMovementsData
            .filter(
              (movement) =>
                movement.order_id &&
                ["sales", "auto", "pos"].includes(
                  normalizeText(movement.source),
                ),
            )
            .map((movement) => movement.order_id as string),
        );

        const autoStockMovements: StockMovementRecord[] = [];
        paidOrders.forEach((order: any) => {
          if (order.id && existingAutoOrderIds.has(order.id)) return;

          (order.order_items || []).forEach((item: any, itemIndex: number) => {
            const qty = Number(item.qty || item.quantity || 0);
            if (qty <= 0) return;

            autoStockMovements.push({
              id: `auto-${order.id || itemIndex}-${item.id || itemIndex}`,
              produk_id:
                item.produk_id ||
                item.product_id ||
                item.produkId ||
                item.productId ||
                null,
              produk_nama:
                item.nama || item.product_name || item.nama_produk || "Menu",
              type: "sold",
              qty,
              reason: "Order dibayar",
              source: "auto",
              order_id: order.id || null,
              created_at: getOrderSalesDate(order) || order.created_at,
              created_by:
                order.staff_name ||
                order.staff_nama ||
                order.cashier_name ||
                order.created_by ||
                order.createdBy ||
                "POS",
            });
          });
        });

        if (autoStockMovements.length > 0) {
          stockMovementsData = [
            ...stockMovementsData,
            ...autoStockMovements,
          ].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        }

        const stockInTotal = stockMovementsData
          .filter((item) => isStockInMovement(item.type))
          .reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const stockOutTotal = stockMovementsData
          .filter((item) => isStockOutMovement(item.type))
          .reduce((sum, item) => sum + Number(item.qty || 0), 0);

        const manualStockInByProduct: Record<string, number> = {};
        const manualStockOutByProduct: Record<string, number> = {};
        stockMovementsData.forEach((movement) => {
          const productKey = movement.produk_id || movement.produk_nama;
          if (!productKey) return;
          if (isStockInMovement(movement.type)) {
            manualStockInByProduct[productKey] =
              (manualStockInByProduct[productKey] || 0) +
              Number(movement.qty || 0);
          }
          if (isStockOutMovement(movement.type)) {
            manualStockOutByProduct[productKey] =
              (manualStockOutByProduct[productKey] || 0) +
              Number(movement.qty || 0);
          }
        });

        const salesMovementOrderIds = new Set(
          stockMovementsData
            .filter(
              (movement) => movement.source === "sales" && movement.order_id,
            )
            .map((movement) => movement.order_id as string),
        );

        const soldQtyByProduct: Record<string, number> = {};
        paidOrders.forEach((order: any) => {
          // Phase 3: kalau order ni sudah ada stock_movements source=sales,
          // jangan kira order_items sekali lagi supaya stock out tak double count.
          if (order.id && salesMovementOrderIds.has(order.id)) return;

          (order.order_items || []).forEach((item: any) => {
            const productKey =
              item.produk_id ||
              item.product_id ||
              item.produkId ||
              item.productId ||
              item.nama ||
              item.product_name ||
              item.nama_produk ||
              "Menu";
            soldQtyByProduct[productKey] =
              (soldQtyByProduct[productKey] || 0) +
              Number(item.qty || item.quantity || 0);
          });
        });

        const inventorySummary = (produkData || [])
          .map((item: any) => {
            const productKeys = [item.id, item.nama].filter(Boolean);
            const stockIn = productKeys.reduce(
              (sum: number, key: string) =>
                sum + (manualStockInByProduct[key] || 0),
              0,
            );
            const manualStockOut = productKeys.reduce(
              (sum: number, key: string) =>
                sum + (manualStockOutByProduct[key] || 0),
              0,
            );
            const soldStockOut = productKeys.reduce(
              (sum: number, key: string) => sum + (soldQtyByProduct[key] || 0),
              0,
            );
            const stockOut = manualStockOut + soldStockOut;
            const stokAkhir = Number(item.stok || 0);
            const stokAwal = stokAkhir - stockIn + stockOut;

            return {
              id: item.id,
              nama: item.nama,
              stokAwal,
              stockIn,
              stockOut,
              stokAkhir,
            };
          })
          .sort(
            (a: InventorySummaryItem, b: InventorySummaryItem) =>
              b.stockOut + b.stockIn - (a.stockOut + a.stockIn),
          ) as InventorySummaryItem[];

        const salesTrend = buildSalesTrendData(paidOrders, filter, from, to);
        const last30DaysSales = buildLast30DaysSalesData(allPaidOrders);
        const recentReceipts = paidOrders.slice(0, 100).map(mapOrderToReceipt);
        const todayReceipts = todayPaidOrders
          .slice(0, 8)
          .map(mapOrderToReceipt);

        setReportData({
          totalSales: jumlahJualan,
          totalOrders: jumlahTransaksi,
          averageOrderValue:
            jumlahTransaksi > 0 ? jumlahJualan / jumlahTransaksi : 0,
          dineInOrders,
          takeawayOrders,
          grossProfit: jumlahUntung,
          cogs: jumlahCOGS,
          margin: jumlahMargin,
          topProducts,
          inventoryReport,
          inventorySummary,
          stockMovements: stockMovementsData,
          stockInTotal,
          stockOutTotal,
          paymentSummary,
          recentReceipts,
          todayReceipts,
          salesTrend,
          last30DaysSales,
        });
      }
    } catch (error) {
      console.error("Owner dashboard fetchAllData error:", error);
      setStats({
        jumlahJualan: 0,
        jumlahTransaksi: 0,
        jumlahCOGS: 0,
        jumlahUntung: 0,
        jumlahMargin: 0,
        stokKritikal: 0,
      });
      if (activeTab === "laporan") {
        setReportData({
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
          inventorySummary: [],
          stockMovements: [],
          stockInTotal: 0,
          stockOutTotal: 0,
          paymentSummary: [],
          recentReceipts: [],
          todayReceipts: [],
          salesTrend: [],
          last30DaysSales: [],
        });
      }
    } finally {
      setLoadingStats(false);
      if (activeTab === "laporan") setLoadingReport(false);
    }
  }

  async function fetchBillingStatus(kedaiId: string) {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const bulan = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    const bulanLabel = lastMonth.toLocaleDateString("ms-MY", {
      month: "long",
      year: "numeric",
    });
    const { data } = (await supabase
      .from("billing")
      .select("status, fee, jualan")
      .eq("kedai_id", kedaiId)
      .eq("bulan", bulan)
      .maybeSingle()) as any;
    setBillingStatus(
      data
        ? {
            status: data.status,
            fee: Number(data.fee || 0),
            jualan: Number(data.jualan || 0),
            bulanLabel,
          }
        : null,
    );
  }

  async function fetchStaff(kedaiId?: string | null) {
    const id = kedaiId || sessionUser?.kedai_id;
    if (!id) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("kedai_id", id)
      .in("role", ["staff", "kitchen"])
      .order("created_at", { ascending: false });
    setStaff(data || []);
  }

  async function ensureDefaultCategories(kedaiId: string) {
    const { data } = (await supabase
      .from("product_categories")
      .select("id")
      .eq("kedai_id", kedaiId)
      .limit(1)) as any;

    if (data && data.length > 0) return;

    await supabase.from("product_categories").insert(
      DEFAULT_PRODUCT_CATEGORIES.map((category) => ({
        kedai_id: kedaiId,
        nama: category.nama,
        icon: category.icon,
        sort_order: category.sort_order,
        is_active: true,
      })) as any,
    );
  }

  async function fetchCategories(kedaiId?: string | null) {
    const id = kedaiId || sessionUser?.kedai_id;
    if (!id) return;

    const { data, error } = (await supabase
      .from("product_categories")
      .select("*")
      .eq("kedai_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })) as any;

    if (error) {
      console.warn("Fetch categories failed:", error);
      setCategories([]);
      return;
    }

    if (!data || data.length === 0) {
      await ensureDefaultCategories(id);
      const retry = (await supabase
        .from("product_categories")
        .select("*")
        .eq("kedai_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })) as any;
      setCategories(retry.data || []);
      return;
    }

    setCategories(data || []);
  }

  function resetCategoryForm() {
    setCategoryNama("");
    setCategoryIcon("food");
    setEditCategoryId(null);
    setEditCategoryNama("");
    setEditCategoryIcon("food");
    setCategoryError("");
  }

  function openManageCategories() {
    resetCategoryForm();
    setShowAddCategory(true);
  }

  function closeManageCategories() {
    resetCategoryForm();
    setShowAddCategory(false);
  }

  async function addCategory() {
    if (!sessionUser?.kedai_id) return;
    const nama = categoryNama.trim();
    if (!nama) {
      setCategoryError("Sila isi nama kategori.");
      return;
    }

    const isDuplicate = categories.some(
      (category) => category.nama.trim().toLowerCase() === nama.toLowerCase(),
    );

    if (isDuplicate) {
      setCategoryError("Nama kategori ini sudah wujud.");
      return;
    }

    setSaving(true);
    setCategoryError("");

    const nextOrder =
      categories.length > 0
        ? Math.max(
            ...categories.map((category) => Number(category.sort_order || 0)),
          ) + 1
        : 1;

    const { error } = await supabase.from("product_categories").insert({
      kedai_id: sessionUser.kedai_id,
      nama,
      icon: categoryIcon,
      sort_order: nextOrder,
      is_active: true,
    } as any);

    setSaving(false);

    if (error) {
      setCategoryError("Gagal tambah kategori. Sila cuba lagi.");
      return;
    }

    setCategoryNama("");
    setCategoryIcon("food");
    await fetchCategories(sessionUser.kedai_id);
  }

  function startEditCategory(category: ProductCategory) {
    setEditCategoryId(category.id);
    setEditCategoryNama(category.nama);
    setEditCategoryIcon(category.icon || "other");
    setCategoryError("");
  }

  function cancelEditCategory() {
    setEditCategoryId(null);
    setEditCategoryNama("");
    setEditCategoryIcon("food");
    setCategoryError("");
  }

  async function updateCategory() {
    if (!sessionUser?.kedai_id || !editCategoryId) return;

    const nama = editCategoryNama.trim();
    if (!nama) {
      setCategoryError("Sila isi nama kategori.");
      return;
    }

    const isDuplicate = categories.some(
      (category) =>
        category.id !== editCategoryId &&
        category.nama.trim().toLowerCase() === nama.toLowerCase(),
    );

    if (isDuplicate) {
      setCategoryError("Nama kategori ini sudah wujud.");
      return;
    }

    setSaving(true);
    setCategoryError("");

    const { error } = await supabase
      .from("product_categories")
      .update({
        nama,
        icon: editCategoryIcon,
      } as any)
      .eq("id", editCategoryId)
      .eq("kedai_id", sessionUser.kedai_id);

    if (error) {
      setSaving(false);
      setCategoryError("Gagal kemaskini kategori. Sila cuba lagi.");
      return;
    }

    await supabase
      .from("produk")
      .update({
        kategori_nama: nama,
        kategori_icon: editCategoryIcon,
      } as any)
      .eq("kedai_id", sessionUser.kedai_id)
      .eq("kategori_id", editCategoryId);

    setSaving(false);
    cancelEditCategory();
    await fetchCategories(sessionUser.kedai_id);
    await fetchProduk(sessionUser.kedai_id);
  }

  async function toggleCategory(id: string, current: boolean) {
    setSaving(true);
    setCategoryError("");

    await supabase
      .from("product_categories")
      .update({ is_active: !current } as any)
      .eq("id", id);

    setSaving(false);
    fetchCategories(sessionUser?.kedai_id);
  }

  async function removeCategory(category: ProductCategory) {
    if (!sessionUser?.kedai_id) return;

    const productCount = produk.filter(
      (product) => product.kategori_id === category.id,
    ).length;

    if (productCount > 0) {
      setCategoryError(
        `Kategori "${category.nama}" masih digunakan oleh ${productCount} menu. Tukar kategori menu dahulu atau nyahaktifkan kategori ini.`,
      );
      return;
    }

    const confirmRemove = window.confirm(
      `Buang kategori "${category.nama}"? Tindakan ini tidak boleh dibatalkan.`,
    );
    if (!confirmRemove) return;

    setSaving(true);
    setCategoryError("");

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", category.id)
      .eq("kedai_id", sessionUser.kedai_id);

    setSaving(false);

    if (error) {
      setCategoryError("Gagal buang kategori. Sila cuba lagi.");
      return;
    }

    if (selectedCategoryFilter === category.id)
      setSelectedCategoryFilter("all");
    if (editCategoryId === category.id) cancelEditCategory();

    fetchCategories(sessionUser.kedai_id);
  }

  function findCategoryById(categoryId?: string | null) {
    return categories.find((category) => category.id === categoryId) || null;
  }

  function resolveProductCategory(product: Partial<Produk>) {
    const category = findCategoryById(product.kategori_id || "");
    if (category) return category;
    if (product.kategori_nama || product.kategori_icon) {
      return {
        id: product.kategori_id || "",
        kedai_id: sessionUser?.kedai_id || "",
        nama: product.kategori_nama || "Lain-lain",
        icon: product.kategori_icon || "other",
        sort_order: 999,
        is_active: true,
      };
    }
    const fallback = getCategoryFallback();
    return {
      id: "",
      kedai_id: sessionUser?.kedai_id || "",
      nama: fallback.nama,
      icon: fallback.icon,
      sort_order: 999,
      is_active: true,
    };
  }

  function activeCategories() {
    return categories.filter((category) => category.is_active);
  }

  async function fetchProduk(kedaiId?: string | null) {
    const id = kedaiId || sessionUser?.kedai_id;
    if (!id) return;
    const { data } = await supabase
      .from("produk")
      .select("*")
      .eq("kedai_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setProduk(data || []);
  }

  async function addStaff() {
    if (!newStaffNama.trim() || !newStaffUsername.trim()) return;
    setSaving(true);
    setStaffError("");
    const { data: existing } = (await supabase
      .from("users")
      .select("id")
      .eq("username", newStaffUsername.toLowerCase())
      .single()) as any;
    if (existing) {
      setStaffError("Username '" + newStaffUsername + "' dah digunakan.");
      setSaving(false);
      return;
    }
    await supabase.from("users").insert({
      nama: newStaffNama,
      username: newStaffUsername.toLowerCase(),
      role: newStaffRole,
      is_active: true,
      kedai_id: sessionUser?.kedai_id,
      password: "abc123",
    } as any);
    setNewStaffNama("");
    setNewStaffUsername("");
    setNewStaffRole("staff");
    setStaffError("");
    setShowAddStaff(false);
    setSaving(false);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function removeStaff(id: string) {
    await supabase.from("users").delete().eq("id", id);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function toggleStaff(id: string, current: boolean) {
    await supabase
      .from("users")
      .update({ is_active: !current } as any)
      .eq("id", id);
    fetchStaff(sessionUser?.kedai_id);
  }

  async function generateNextProductCode(kedaiId: string) {
    const { data } = (await supabase
      .from("produk")
      .select("kod_produk, created_at")
      .eq("kedai_id", kedaiId)
      .order("created_at", { ascending: true })) as any;

    const maxNumber = (data || []).reduce((max: number, item: any) => {
      const match = String(item?.kod_produk || "").match(/^PRD-(\d+)$/i);
      if (!match) return max;

      const numberValue = Number(match[1]);
      return Number.isNaN(numberValue) ? max : Math.max(max, numberValue);
    }, 0);

    return `PRD-${String(maxNumber + 1).padStart(4, "0")}`;
  }

  async function addProduk() {
    if (!produkNama.trim() || !sessionUser?.kedai_id) return;
    setSaving(true);
    const selectedCategory = findCategoryById(produkKategoriId);
    const fallbackCategory = getCategoryFallback();
    const kodProduk = await generateNextProductCode(sessionUser.kedai_id);

    await supabase.from("produk").insert({
      kod_produk: kodProduk,
      nama: produkNama,
      harga_jual: parseFloat(produkHarga) || 0,
      kos_produk: parseFloat(produkKos) || 0,
      stok: parseInt(produkStok) || 0,
      kedai_id: sessionUser?.kedai_id,
      kategori_id: selectedCategory?.id || null,
      kategori_nama: selectedCategory?.nama || fallbackCategory.nama,
      kategori_icon: selectedCategory?.icon || fallbackCategory.icon,
    } as any);
    setProdukNama("");
    setProdukHarga("");
    setProdukKos("");
    setProdukStok("");
    setProdukKategoriId("");
    setShowAddProduk(false);
    setSaving(false);
    fetchProduk(sessionUser?.kedai_id);
  }

  async function removeProduk(id: string) {
    await supabase
      .from("produk")
      .update({ is_active: false } as any)
      .eq("id", id);
    fetchProduk(sessionUser?.kedai_id);
  }

  function openEditProduk(p: Produk) {
    setEditProdukId(p.id);
    setEditProdukNama(p.nama);
    setEditProdukHarga(p.harga_jual.toString());
    setEditProdukKos(p.kos_produk.toString());
    setEditProdukKategoriId(p.kategori_id || "");
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
    setEditProdukKategoriId("");
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
    let movementQty = 0;
    let movementType: "in" | "out" | null = null;
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
      stokBaru =
        editStokMode === "tambah" ? editStokSemasa + qty : editStokSemasa - qty;
      movementQty = qty;
      movementType = editStokMode === "tambah" ? "in" : "out";
      if (stokBaru < 0) {
        setEditStokError(
          `Stok tidak mencukupi. Stok semasa: ${editStokSemasa} unit.`,
        );
        setSaving(false);
        return;
      }
    }
    const selectedCategory = findCategoryById(editProdukKategoriId);
    const fallbackCategory = getCategoryFallback();

    const { error: updateProdukError } = await supabase
      .from("produk")
      .update({
        nama: editProdukNama,
        harga_jual: parseFloat(editProdukHarga) || 0,
        kos_produk: parseFloat(editProdukKos) || 0,
        stok: stokBaru,
        kategori_id: selectedCategory?.id || null,
        kategori_nama: selectedCategory?.nama || fallbackCategory.nama,
        kategori_icon: selectedCategory?.icon || fallbackCategory.icon,
      } as any)
      .eq("id", editProdukId);

    if (updateProdukError) {
      setEditStokError("Gagal kemaskini produk. Sila cuba lagi.");
      setSaving(false);
      return;
    }

    if (movementQty > 0 && movementType) {
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          kedai_id: sessionUser?.kedai_id,
          produk_id: editProdukId,
          produk_nama: editProdukNama,
          type: movementType,
          qty: movementQty,
          reason: editStokReason.trim(),
          source: "manual",
          created_by: sessionUser?.nama || sessionUser?.username || "Owner",
        } as any);

      if (movementError) {
        console.warn("Stock movement log failed:", movementError);
      }
    }

    closeEditProduk();
    setSaving(false);
    fetchProduk(sessionUser?.kedai_id);
    if (sessionUser?.kedai_id) fetchAllData(sessionUser.kedai_id);
  }

  async function tukarPassword() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Password baru tidak sepadan.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Password kena sekurang-kurangnya 6 aksara.");
      return;
    }
    const { data: user } = (await supabase
      .from("users")
      .select("password")
      .eq("username", sessionUser?.username)
      .single()) as any;
    if (user?.password !== currentPassword) {
      setPasswordMsg("Password semasa tidak betul.");
      return;
    }
    await supabase
      .from("users")
      .update({ password: newPassword } as any)
      .eq("username", sessionUser?.username);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("Password berjaya ditukar!");
    setTimeout(() => setPasswordMsg(""), 3000);
  }

  async function resetPasswordStaff() {
    if (!resetStaffId || !newStaffPassword.trim()) return;
    await supabase
      .from("users")
      .update({ password: newStaffPassword } as any)
      .eq("id", resetStaffId);
    setResetStaffId(null);
    setNewStaffPassword("");
    setResetMsg("Password staff berjaya direset!");
    setTimeout(() => setResetMsg(""), 3000);
  }

  async function saveTableCount() {
    if (!sessionUser?.kedai_id) return;
    const finalCount = Math.min(Math.max(Number(tableCountInput) || 6, 1), 20);
    setSaving(true);
    setTableMsg("");
    const { error } = await supabase
      .from("kedai")
      .update({ table_count: finalCount } as any)
      .eq("id", sessionUser.kedai_id);
    setSaving(false);
    if (error) {
      setTableMsg("Gagal simpan bilangan meja.");
      return;
    }
    setKedaiInfo((prev) =>
      prev ? { ...prev, table_count: finalCount } : prev,
    );
    setTableCountInput(finalCount);
    setTableMsg("Setup meja berjaya disimpan.");
    setTimeout(() => setTableMsg(""), 3000);
  }

  function changeTableCount(value: number) {
    setTableMsg("");
    setTableCountInput(Math.min(Math.max(value, 1), 20));
  }

  function sanitizeFileName(fileName: string) {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  async function uploadKedaiAsset(
    file: File | null,
    assetType: "logo" | "duitnow_qr",
  ) {
    if (!file || !sessionUser?.kedai_id) return;

    const isLogo = assetType === "logo";
    if (!file.type.startsWith("image/")) {
      setStoreSetupMsg("Sila upload fail gambar sahaja.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setStoreSetupMsg("Saiz gambar maksimum 3MB sahaja.");
      return;
    }

    setStoreSetupMsg("");
    if (isLogo) setUploadingLogo(true);
    else setUploadingQr(true);

    try {
      const safeName = sanitizeFileName(file.name);
      const path = `${sessionUser.kedai_id}/${assetType}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("kedai-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setStoreSetupMsg(`Upload gagal: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("kedai-assets")
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        setStoreSetupMsg("Gagal dapatkan URL gambar.");
        return;
      }

      const columnName = isLogo ? "logo_url" : "duitnow_qr_url";
      const { error: updateError } = await supabase
        .from("kedai")
        .update({ [columnName]: publicUrl } as any)
        .eq("id", sessionUser.kedai_id);

      if (updateError) {
        setStoreSetupMsg(`Gagal simpan gambar: ${updateError.message}`);
        return;
      }

      setKedaiInfo((prev) =>
        prev ? { ...prev, [columnName]: publicUrl } : prev,
      );
      setStoreSetupMsg(
        isLogo
          ? "Logo kedai berjaya disimpan."
          : "QR DuitNow berjaya disimpan.",
      );
      setTimeout(() => setStoreSetupMsg(""), 3000);
    } catch (error) {
      console.error("Upload kedai asset error:", error);
      setStoreSetupMsg("Upload gagal. Sila cuba lagi.");
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingQr(false);
    }
  }

  async function saveThemeSetting() {
    if (!sessionUser?.kedai_id) return;
    setSaving(true);
    setThemeMsg("");

    const { error } = await supabase
      .from("kedai")
      .update({
        accent_color: selectedAccentColor,
        theme_mode: selectedThemeMode,
      } as any)
      .eq("id", sessionUser.kedai_id);

    setSaving(false);

    if (error) {
      setThemeMsg(`Gagal simpan theme: ${error.message}`);
      return;
    }

    setKedaiInfo((prev) =>
      prev
        ? {
            ...prev,
            accent_color: selectedAccentColor,
            theme_mode: selectedThemeMode,
          }
        : prev,
    );
    setThemeMsg("Theme kedai berjaya disimpan.");
    setTimeout(() => setThemeMsg(""), 3000);
  }

  async function saveChargeSetting() {
    if (!sessionUser?.kedai_id) return;

    const finalSstRate = Math.max(0, Math.min(Number(sstRate) || 0, 100));
    const finalServiceChargeRate = Math.max(
      0,
      Math.min(Number(serviceChargeRate) || 0, 100),
    );

    setSaving(true);
    setChargeMsg("");

    const { error } = await supabase
      .from("kedai")
      .update({
        sst_enabled: sstEnabled,
        sst_rate: finalSstRate,
        service_charge_enabled: serviceChargeEnabled,
        service_charge_rate: finalServiceChargeRate,
      } as any)
      .eq("id", sessionUser.kedai_id);

    setSaving(false);

    if (error) {
      setChargeMsg(`Gagal simpan setup caj: ${error.message}`);
      return;
    }

    setSstRate(String(finalSstRate));
    setServiceChargeRate(String(finalServiceChargeRate));
    setKedaiInfo((prev) =>
      prev
        ? {
            ...prev,
            sst_enabled: sstEnabled,
            sst_rate: finalSstRate,
            service_charge_enabled: serviceChargeEnabled,
            service_charge_rate: finalServiceChargeRate,
          }
        : prev,
    );
    setChargeMsg("Setup caj berjaya disimpan.");
    setTimeout(() => setChargeMsg(""), 3000);
  }

  function formatDateLabel(date: string) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function openFilterDropdown() {
    setShowFilterDropdown((prev) => !prev);
  }

  function applyQuickFilter(value: FilterType) {
    if (value === "custom") {
      setPendingFilter("custom");
      setPendingCustomFrom(customFrom);
      setPendingCustomTo(customTo);
      setShowFilterDropdown(false);
      setShowFilterModal(true);
      return;
    }
    setFilter(value);
    setShowFilterDropdown(false);
  }

  function applyFilterModal() {
    if (!pendingCustomFrom || !pendingCustomTo) return;
    setFilter("custom");
    setCustomFrom(pendingCustomFrom);
    setCustomTo(pendingCustomTo);
    setShowFilterModal(false);
  }

  function filterLabel() {
    if (filter === "daily") return "Hari Ini";
    if (filter === "yesterday") return "Semalam";
    if (filter === "weekly") return "7 Hari Lepas";
    if (filter === "monthly") return "Bulan Ini";
    if (filter === "custom" && customFrom && customTo)
      return `${formatDateLabel(customFrom)} — ${formatDateLabel(customTo)}`;
    return "Tarikh Custom";
  }

  function pendingFilterLabel(value: FilterType) {
    if (value === "daily") return "Hari Ini";
    if (value === "yesterday") return "Semalam";
    if (value === "weekly") return "7 Hari Lepas";
    if (value === "monthly") return "Bulan Ini";
    return "Tarikh Custom";
  }

  function formatRM(value: number) {
    return `RM ${Number(value || 0).toFixed(2)}`;
  }

  function getReceiptItemsSubtotal(receipt: RecentReceipt) {
    return (receipt.order_items || []).reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.harga || 0),
      0,
    );
  }

  function getReceiptSubtotal(receipt: RecentReceipt) {
    const subtotal = Number(receipt.subtotal || 0);
    if (subtotal > 0) return subtotal;

    const itemsSubtotal = getReceiptItemsSubtotal(receipt);
    if (itemsSubtotal > 0) return itemsSubtotal;

    const total = Number(receipt.total || 0);
    const serviceCharge = Number(receipt.service_charge_amount || 0);
    const sst = Number(receipt.sst_amount || 0);
    return Math.max(total - serviceCharge - sst, 0);
  }

  function getReceiptServiceCharge(receipt: RecentReceipt) {
    return Number(receipt.service_charge_amount || 0);
  }

  function getReceiptSst(receipt: RecentReceipt) {
    return Number(receipt.sst_amount || 0);
  }

  function shouldShowReceiptCaj(receipt: RecentReceipt) {
    return getReceiptServiceCharge(receipt) > 0 || getReceiptSst(receipt) > 0;
  }

  function formatReceiptRate(value?: number | null) {
    const rate = Number(value || 0);
    return Number.isInteger(rate) ? String(rate) : rate.toFixed(2);
  }

  function formatReceiptDate(dateValue: string) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatReceiptDateOnly(dateValue: string) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatReceiptTimeOnly(dateValue: string) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleTimeString("ms-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMovementType(type: string) {
    if (isStockInMovement(type)) return "Masuk";
    if (isStockOutMovement(type)) return "Keluar";
    return "Adjustment";
  }

  function formatMovementShortType(type: string) {
    if (isStockInMovement(type)) return "In";
    if (isStockOutMovement(type)) return "Out";
    return "Adjust";
  }

  function formatMovementSource(
    source?: string | null,
    orderId?: string | null,
  ) {
    const normalized = normalizeText(source);
    if (["auto", "sales", "pos"].includes(normalized) || orderId) return "Auto";
    return "Manual";
  }

  function formatMovementActor(item: StockMovementRecord) {
    return (
      item.created_by ||
      (formatMovementSource(item.source, item.order_id) === "Auto"
        ? "POS"
        : "Owner")
    );
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
      kedaiInfo?.nama || "Kedai Saya",
      "Powered by UrusPOS",
      "",
      `Receipt: #${receiptNo}`,
      `Tarikh: ${formatReceiptDate(receipt.created_at)}`,
      `Jenis: ${displayMejaLabel(receipt.meja)}`,
      `Bayaran: ${receipt.payment_method || "Belum direkod"}`,
      "",
      "ITEM",
      ...receipt.order_items.flatMap((item) => {
        const baseLine = `${item.nama} x${item.qty} @ ${formatRM(item.harga)} = ${formatRM(item.qty * item.harga)}`;
        return item.nota ? [baseLine, `Nota: ${item.nota}`] : [baseLine];
      }),
      "",
      ...(shouldShowReceiptCaj(receipt)
        ? [
            `Subtotal: ${formatRM(getReceiptSubtotal(receipt))}`,
            ...(getReceiptServiceCharge(receipt) > 0
              ? [
                  `Service Charge (${formatReceiptRate(receipt.service_charge_rate)}%): ${formatRM(
                    getReceiptServiceCharge(receipt),
                  )}`,
                ]
              : []),
            ...(getReceiptSst(receipt) > 0
              ? [
                  `SST (${formatReceiptRate(receipt.sst_rate)}%): ${formatRM(getReceiptSst(receipt))}`,
                ]
              : []),
          ]
        : []),
      `TOTAL: ${formatRM(receipt.total)}`,
      "",
      "Terima kasih.",
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${receiptNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const marginTambah =
    produkHarga && produkKos
      ? Math.round(
          ((parseFloat(produkHarga) - parseFloat(produkKos)) /
            parseFloat(produkHarga)) *
            100,
        )
      : 0;
  const marginEdit =
    editProdukHarga && editProdukKos
      ? Math.round(
          ((parseFloat(editProdukHarga) - parseFloat(editProdukKos)) /
            parseFloat(editProdukHarga)) *
            100,
        )
      : 0;
  const previewStokBaru =
    editStokQty && !isNaN(parseInt(editStokQty))
      ? editStokMode === "tambah"
        ? editStokSemasa + parseInt(editStokQty)
        : editStokSemasa - parseInt(editStokQty)
      : null;

  const filteredProduk = produk.filter((product) => {
    const category = resolveProductCategory(product);
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      product.kategori_id === selectedCategoryFilter;
    const keyword = inventorySearch.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      product.nama.toLowerCase().includes(keyword) ||
      category.nama.toLowerCase().includes(keyword) ||
      getProductDisplayId(product).toLowerCase().includes(keyword);

    return matchesCategory && matchesSearch;
  });

  function categoryFilterLabel() {
    if (selectedCategoryFilter === "all") return "Semua Kategori";
    const category = findCategoryById(selectedCategoryFilter);
    return category ? category.nama : "Kategori";
  }

  function applyCategoryFilter(categoryId: string) {
    setSelectedCategoryFilter(categoryId);
    setShowCategoryFilterDropdown(false);
  }

  function getProductDisplayId(product: Produk) {
    return product.kod_produk || "PRD-0000";
  }

  function getProductMargin(product: Produk) {
    return product.harga_jual > 0
      ? Math.round(
          ((product.harga_jual - product.kos_produk) / product.harga_jual) *
            100,
        )
      : 0;
  }

  function getStockStatus(product: Produk) {
    const stock = Number(product.stok || 0);

    if (stock <= 0) {
      return {
        label: "Habis",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-600 border-red-100",
        row: "text-red-600",
      };
    }

    if (stock <= 5) {
      return {
        label: "Stok Rendah",
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-100",
        row: "text-amber-600",
      };
    }

    return {
      label: "Stok OK",
      dot: "bg-[var(--accent-500)]",
      badge:
        "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]",
      row: "text-gray-900",
    };
  }

  function normalizeKedaiStatus(status?: string | null) {
    return String(status || "")
      .trim()
      .toLowerCase();
  }
  const kedaiStatus = normalizeKedaiStatus(kedaiInfo?.status);
  const isBeta = kedaiStatus === "beta";
  const isActivePlan = kedaiStatus === "active" || kedaiStatus === "aktif";
  const isSuspended = kedaiStatus === "suspended" || kedaiStatus === "suspend";

  const planInfo = isBeta
    ? {
        label: "BETA",
        title: "Beta — Cuba Percuma",
        bg: "bg-yellow-50 border-yellow-200",
        titleColor: "text-yellow-800",
        labelColor: "text-yellow-700",
        pill: "bg-yellow-200 text-yellow-800",
      }
    : isActivePlan
      ? {
          label: "AKTIF",
          title: "Aktif — 2% Jualan",
          bg: "bg-[var(--accent-50)] border-[var(--accent-200)]",
          titleColor: "text-[var(--accent-800)]",
          labelColor: "text-[var(--accent-700)]",
          pill: "bg-[var(--accent-200)] text-[var(--accent-800)]",
        }
      : isSuspended
        ? {
            label: "SUSPENDED",
            title: "Suspended — Akses Ditangguhkan",
            bg: "bg-red-50 border-red-200",
            titleColor: "text-red-800",
            labelColor: "text-red-700",
            pill: "bg-red-200 text-red-800",
          }
        : {
            label: "BELUM SET",
            title: "Status kedai belum ditetapkan",
            bg: "bg-gray-50 border-gray-200",
            titleColor: "text-gray-800",
            labelColor: "text-gray-600",
            pill: "bg-gray-200 text-gray-800",
          };

  const urusposFee = urusposFeeEstimate.fee;
  const PlanIcon = isBeta
    ? Clock3
    : isActivePlan
      ? CircleCheck
      : isSuspended
        ? Ban
        : AlertTriangle;

  const accentColorOptions = [
    {
      id: "green",
      label: "Green",
      dot: "bg-green-600",
      ring: "border-green-500",
      sample: "bg-green-600",
    },
    {
      id: "blue",
      label: "Blue",
      dot: "bg-blue-600",
      ring: "border-blue-500",
      sample: "bg-blue-600",
    },
    {
      id: "purple",
      label: "Purple",
      dot: "bg-purple-600",
      ring: "border-purple-500",
      sample: "bg-purple-600",
    },
    {
      id: "red",
      label: "Red",
      dot: "bg-red-600",
      ring: "border-red-500",
      sample: "bg-red-600",
    },
    {
      id: "orange",
      label: "Orange",
      dot: "bg-orange-500",
      ring: "border-orange-400",
      sample: "bg-orange-500",
    },
    {
      id: "amber",
      label: "Amber",
      dot: "bg-amber-500",
      ring: "border-amber-400",
      sample: "bg-amber-500",
    },
    {
      id: "pink",
      label: "Pink",
      dot: "bg-pink-500",
      ring: "border-pink-400",
      sample: "bg-pink-500",
    },
    {
      id: "teal",
      label: "Teal",
      dot: "bg-teal-500",
      ring: "border-teal-400",
      sample: "bg-teal-500",
    },
    {
      id: "indigo",
      label: "Indigo",
      dot: "bg-indigo-600",
      ring: "border-indigo-500",
      sample: "bg-indigo-600",
    },
    {
      id: "slate",
      label: "Slate",
      dot: "bg-slate-700",
      ring: "border-slate-500",
      sample: "bg-slate-700",
    },
  ];

  const selectedAccent =
    accentColorOptions.find((color) => color.id === selectedAccentColor) ||
    accentColorOptions[0];

  const accentThemeMap: Record<string, Record<string, string>> = {
    green: {
      "50": "#f0fdf4",
      "100": "#dcfce7",
      "200": "#bbf7d0",
      "300": "#86efac",
      "500": "#22c55e",
      "600": "#16a34a",
      "700": "#15803d",
      "800": "#166534",
      "900": "#14532d",
      gradientFrom: "#166534",
      gradientTo: "#22c55e",
      textOnAccent: "#ffffff",
    },
    blue: {
      "50": "#eff6ff",
      "100": "#dbeafe",
      "200": "#bfdbfe",
      "300": "#93c5fd",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8",
      "800": "#1e40af",
      "900": "#1e3a8a",
      gradientFrom: "#1e40af",
      gradientTo: "#3b82f6",
      textOnAccent: "#ffffff",
    },
    purple: {
      "50": "#faf5ff",
      "100": "#f3e8ff",
      "200": "#e9d5ff",
      "300": "#d8b4fe",
      "500": "#a855f7",
      "600": "#9333ea",
      "700": "#7e22ce",
      "800": "#6b21a8",
      "900": "#581c87",
      gradientFrom: "#6b21a8",
      gradientTo: "#a855f7",
      textOnAccent: "#ffffff",
    },
    red: {
      "50": "#fef2f2",
      "100": "#fee2e2",
      "200": "#fecaca",
      "300": "#fca5a5",
      "500": "#ef4444",
      "600": "#dc2626",
      "700": "#b91c1c",
      "800": "#991b1b",
      "900": "#7f1d1d",
      gradientFrom: "#991b1b",
      gradientTo: "#ef4444",
      textOnAccent: "#ffffff",
    },
    orange: {
      "50": "#fff7ed",
      "100": "#ffedd5",
      "200": "#fed7aa",
      "300": "#fdba74",
      "500": "#f97316",
      "600": "#ea580c",
      "700": "#c2410c",
      "800": "#9a3412",
      "900": "#7c2d12",
      gradientFrom: "#9a3412",
      gradientTo: "#f97316",
      textOnAccent: "#ffffff",
    },
    amber: {
      "50": "#fffbeb",
      "100": "#fef3c7",
      "200": "#fde68a",
      "300": "#fcd34d",
      "500": "#f59e0b",
      "600": "#d97706",
      "700": "#b45309",
      "800": "#92400e",
      "900": "#78350f",
      gradientFrom: "#92400e",
      gradientTo: "#f59e0b",
      textOnAccent: "#ffffff",
    },
    pink: {
      "50": "#fdf2f8",
      "100": "#fce7f3",
      "200": "#fbcfe8",
      "300": "#f9a8d4",
      "500": "#ec4899",
      "600": "#db2777",
      "700": "#be185d",
      "800": "#9d174d",
      "900": "#831843",
      gradientFrom: "#9d174d",
      gradientTo: "#ec4899",
      textOnAccent: "#ffffff",
    },
    teal: {
      "50": "#f0fdfa",
      "100": "#ccfbf1",
      "200": "#99f6e4",
      "300": "#5eead4",
      "500": "#14b8a6",
      "600": "#0d9488",
      "700": "#0f766e",
      "800": "#115e59",
      "900": "#134e4a",
      gradientFrom: "#115e59",
      gradientTo: "#14b8a6",
      textOnAccent: "#ffffff",
    },
    indigo: {
      "50": "#eef2ff",
      "100": "#e0e7ff",
      "200": "#c7d2fe",
      "300": "#a5b4fc",
      "500": "#6366f1",
      "600": "#4f46e5",
      "700": "#4338ca",
      "800": "#3730a3",
      "900": "#312e81",
      gradientFrom: "#3730a3",
      gradientTo: "#6366f1",
      textOnAccent: "#ffffff",
    },
    slate: {
      "50": "#f8fafc",
      "100": "#f1f5f9",
      "200": "#e2e8f0",
      "300": "#cbd5e1",
      "500": "#64748b",
      "600": "#475569",
      "700": "#334155",
      "800": "#1e293b",
      "900": "#0f172a",
      gradientFrom: "#1e293b",
      gradientTo: "#64748b",
      textOnAccent: "#ffffff",
    },
  };

  const accentTheme =
    accentThemeMap[selectedAccentColor] || accentThemeMap.green;
  const accentStyle = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    "--accent-50": accentTheme["50"],
    "--accent-100": accentTheme["100"],
    "--accent-200": accentTheme["200"],
    "--accent-300": accentTheme["300"],
    "--accent-500": accentTheme["500"],
    "--accent-600": accentTheme["600"],
    "--accent-700": accentTheme["700"],
    "--accent-800": accentTheme["800"],
    "--accent-900": accentTheme["900"],
    "--accent-gradient-from": accentTheme.gradientFrom,
    "--accent-gradient-to": accentTheme.gradientTo,
    "--accent-text": accentTheme.textOnAccent,
  } as CSSProperties;

  const navItems = [
    {
      id: "dashboard",
      icon: LayoutDashboard,
      label: "Utama",
      description: "Ringkasan jualan",
    },
    {
      id: "inventory",
      icon: Utensils,
      label: "Menu",
      description: "Menu & stok",
    },
    {
      id: "laporan",
      icon: BarChart2,
      label: "Jualan",
      description: "Rumusan & resit",
    },
    {
      id: "staff",
      icon: Users,
      label: "Staff",
      description: "Akaun pekerja",
    },
    {
      id: "settings",
      icon: Settings,
      label: "Tetapan",
      description: "Password & akses",
    },
  ];

  const reportMenuItems = [
    {
      id: "sales-summary",
      icon: DollarSign,
      label: "Rumusan Jualan",
      description: "Sales, order, margin & payment",
    },
    {
      id: "receipts",
      icon: Receipt,
      label: "Rekod Resit",
      description: "Senarai resit jualan",
    },
  ];

  const inventoryMenuItems = [
    {
      id: "inventory",
      icon: Utensils,
      label: "Inventori",
      description: "Senarai menu & stok",
    },
    {
      id: "summary",
      icon: ClipboardList,
      label: "Rumusan Menu",
      description: "Stok awal, masuk, keluar & akhir",
    },
    {
      id: "records",
      icon: History,
      label: "Rekod Menu",
      description: "Rekod auto & manual",
    },
  ];

  const settingsMenuItems = [
    {
      id: "table-setup",
      icon: Armchair,
      label: "Setup Meja",
      description: "Bilangan meja POS",
    },
    {
      id: "store-setup",
      icon: Store,
      label: "Setup Kedai",
      description: "Logo & QR DuitNow",
    },
    {
      id: "charge-setup",
      icon: BadgePercent,
      label: "Setup Caj",
      description: "SST & service charge",
    },
    {
      id: "theme",
      icon: Palette,
      label: "Theme",
      description: "Warna & mode paparan",
    },
    {
      id: "password",
      icon: LockKeyhole,
      label: "Password",
      description: "Tukar password owner",
    },
  ];

  function changeTab(tabId: string) {
    if (tabId === "inventory") {
      setShowInventorySubmenu((prev) => !prev);
      setShowReportSubmenu(false);
      setShowSettingsSubmenu(false);
      return;
    }

    if (tabId === "laporan") {
      setShowReportSubmenu((prev) => !prev);
      setShowInventorySubmenu(false);
      setShowSettingsSubmenu(false);
      return;
    }

    if (tabId === "settings") {
      setShowSettingsSubmenu((prev) => !prev);
      setShowInventorySubmenu(false);
      setShowReportSubmenu(false);
      return;
    }

    setActiveTab(tabId);
    setShowInventorySubmenu(false);
    setShowReportSubmenu(false);
    setShowSettingsSubmenu(false);
    setShowMobileMenu(false);
  }

  function changeInventoryTab(inventoryTabId: string) {
    setActiveTab("inventory");
    setActiveInventoryTab(inventoryTabId);
    setShowInventorySubmenu(true);
    setShowReportSubmenu(false);
    setShowSettingsSubmenu(false);
    setShowMobileMenu(false);
  }

  function changeReportTab(reportTabId: string) {
    setActiveTab("laporan");
    setActiveReportTab(reportTabId);
    setShowReportSubmenu(true);
    setShowInventorySubmenu(false);
    setShowSettingsSubmenu(false);
    setShowMobileMenu(false);
  }

  function changeSettingsTab(settingsTabId: string) {
    setActiveTab("settings");
    setActiveSettingsTab(settingsTabId);
    setShowSettingsSubmenu(true);
    setShowInventorySubmenu(false);
    setShowReportSubmenu(false);
    setShowMobileMenu(false);
  }

  const activeNav = navItems.find((item) => item.id === activeTab);
  const activeInventory = inventoryMenuItems.find(
    (item) => item.id === activeInventoryTab,
  );
  const activeReport = reportMenuItems.find(
    (item) => item.id === activeReportTab,
  );
  const activeSettings = settingsMenuItems.find(
    (item) => item.id === activeSettingsTab,
  );
  const ActiveSettingsIcon = activeSettings?.icon || Settings;
  const kedaiLogoUrl = String(kedaiInfo?.logo_url || "").trim();
  const recordsTotalPages = Math.max(
    1,
    Math.ceil(reportData.stockMovements.length / RECORDS_PER_PAGE),
  );
  const safeRecordsPage = Math.min(recordsPage, recordsTotalPages);
  const paginatedStockMovements = reportData.stockMovements.slice(
    (safeRecordsPage - 1) * RECORDS_PER_PAGE,
    safeRecordsPage * RECORDS_PER_PAGE,
  );
  const recordsStartIndex =
    reportData.stockMovements.length === 0
      ? 0
      : (safeRecordsPage - 1) * RECORDS_PER_PAGE + 1;
  const recordsEndIndex = Math.min(
    safeRecordsPage * RECORDS_PER_PAGE,
    reportData.stockMovements.length,
  );

  const FilterBar = () => (
    <div className="relative inline-block mb-4">
      <button
        onClick={openFilterDropdown}
        className="inline-flex items-center gap-2 bg-white border border-[var(--accent-200)] text-gray-900 px-4 py-2.5 rounded-full text-xs font-medium shadow-sm hover:border-[var(--accent-300)] hover:bg-[var(--accent-50)] active:scale-95 transition-all"
      >
        <CalendarDays
          size={15}
          strokeWidth={2.1}
          className="text-[var(--accent-600)]"
        />
        <span>{filterLabel()}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {showFilterDropdown && (
        <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl z-40 overflow-hidden p-2">
          {(
            [
              "daily",
              "yesterday",
              "monthly",
              "weekly",
              "custom",
            ] as FilterType[]
          ).map((option) => (
            <button
              key={option}
              onClick={() => applyQuickFilter(option)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${filter === option ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span>{pendingFilterLabel(option)}</span>
              {filter === option && (
                <CircleCheck size={14} className="text-[var(--accent-600)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const userProfilePhotoUrl = String(
    sessionUser?.profile_photo_url ||
      sessionUser?.avatar_url ||
      sessionUser?.photo_url ||
      sessionUser?.image_url ||
      "",
  ).trim();
  const userInitial = String(sessionUser?.nama || sessionUser?.username || "O")
    .slice(0, 1)
    .toUpperCase();

  const OwnerSidebarMenu = ({
    expanded,
    mobile = false,
  }: {
    expanded: boolean;
    mobile?: boolean;
  }) => (
    <>
      <div
        className={`${expanded ? "px-5" : "px-3"} h-16 flex items-center justify-between border-b border-gray-100 bg-white`}
      >
        {expanded ? (
          <div className="min-w-0">
            <div className="text-gray-900 font-medium text-base tracking-tight leading-none">
              Urus<span className="text-[var(--accent-600)]">POS</span>
            </div>
            <div className="text-gray-400 text-[9px] font-medium tracking-widest uppercase mt-1.5">
              Owner Dashboard
            </div>
          </div>
        ) : (
          <div className="w-full" />
        )}

        {mobile ? (
          <button
            onClick={() => setShowMobileMenu(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
            aria-label="Tutup menu"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <button
            onClick={() => setDesktopSidebarExpanded((value) => !value)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse menu" : "Expand menu"}
          >
            <span className="text-sm font-medium leading-none">
              {expanded ? "‹‹" : "››"}
            </span>
          </button>
        )}
      </div>

      <nav
        className={`${expanded ? "px-4" : "px-3"} flex-1 py-5 overflow-y-auto bg-white`}
      >
        {expanded && (
          <div className="text-gray-300 text-[10px] font-medium tracking-widest uppercase px-1 mb-3">
            Overview
          </div>
        )}

        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const isInventoryItem = item.id === "inventory";
            const isReportItem = item.id === "laporan";
            const isSettingsItem = item.id === "settings";
            const isInventoryOpen = showInventorySubmenu || isActive;
            const isReportOpen = showReportSubmenu || isActive;
            const isSettingsOpen = showSettingsSubmenu || isActive;
            const parentActive = isInventoryItem
              ? isInventoryOpen
              : isReportItem
                ? isReportOpen
                : isSettingsItem
                  ? isSettingsOpen
                  : isActive;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  title={!expanded ? item.label : undefined}
                  onClick={() => {
                    if (
                      !expanded &&
                      !mobile &&
                      (isInventoryItem || isReportItem || isSettingsItem)
                    ) {
                      setDesktopSidebarExpanded(true);
                    }
                    changeTab(item.id);
                  }}
                  className={`relative w-full flex items-center rounded-lg text-sm font-medium transition-all ${
                    expanded ? "gap-3 px-3 py-3" : "justify-center px-0 py-3"
                  } ${
                    parentActive
                      ? "text-[var(--accent-700)] bg-[var(--accent-50)]"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {expanded && parentActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent-600)]" />
                  )}

                  <Icon
                    size={17}
                    strokeWidth={1.8}
                    className={
                      parentActive
                        ? "text-[var(--accent-600)]"
                        : "text-gray-400"
                    }
                  />

                  {expanded && (
                    <>
                      <span className="flex-1 text-left truncate">
                        {item.label}
                      </span>

                      {(isInventoryItem || isReportItem || isSettingsItem) && (
                        <ChevronDown
                          size={14}
                          strokeWidth={1.8}
                          className={`transition-transform ${
                            parentActive
                              ? "rotate-180 text-[var(--accent-600)]"
                              : "text-gray-300"
                          }`}
                        />
                      )}
                    </>
                  )}
                </button>

                {expanded && isInventoryItem && isInventoryOpen && (
                  <div className="ml-4 border-l border-gray-100 pl-3 space-y-1">
                    {inventoryMenuItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === "inventory" &&
                        activeInventoryTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => changeInventoryTab(sub.id)}
                          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                            isSubActive
                              ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <SubIcon
                            size={14}
                            strokeWidth={1.8}
                            className={
                              isSubActive
                                ? "text-[var(--accent-600)]"
                                : "text-gray-400"
                            }
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {expanded && isReportItem && isReportOpen && (
                  <div className="ml-4 border-l border-gray-100 pl-3 space-y-1">
                    {reportMenuItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === "laporan" && activeReportTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => changeReportTab(sub.id)}
                          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                            isSubActive
                              ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <SubIcon
                            size={14}
                            strokeWidth={1.8}
                            className={
                              isSubActive
                                ? "text-[var(--accent-600)]"
                                : "text-gray-400"
                            }
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {expanded && isSettingsItem && isSettingsOpen && (
                  <div className="ml-4 border-l border-gray-100 pl-3 space-y-1">
                    {settingsMenuItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === "settings" &&
                        activeSettingsTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => changeSettingsTab(sub.id)}
                          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${
                            isSubActive
                              ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <SubIcon
                            size={14}
                            strokeWidth={1.8}
                            className={
                              isSubActive
                                ? "text-[var(--accent-600)]"
                                : "text-gray-400"
                            }
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div
        className={`${expanded ? "px-4" : "px-3"} py-4 border-t border-gray-100 bg-white`}
      >
        <a
          href="/auth/logout"
          title={!expanded ? "Log Keluar" : undefined}
          className={`flex items-center rounded-lg text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all ${
            expanded ? "gap-3 px-3 py-3" : "justify-center px-0 py-3"
          }`}
        >
          <LogOut size={16} strokeWidth={1.8} />
          {expanded && <span>Log Keluar</span>}
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f2] pb-10" style={accentStyle}>
      {/* Desktop Menu */}
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen bg-white border-r border-gray-100 flex-col transition-all duration-200 lg:flex ${
          desktopSidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        <OwnerSidebarMenu expanded={desktopSidebarExpanded} />
      </aside>

      {/* Header */}
      <div
        className={`sticky top-0 z-30 bg-[#f6f7f2]/90 backdrop-blur border-b border-black/5 transition-all duration-200 ${
          desktopSidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <div className="px-4 sm:px-6 py-4 w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-2xl bg-white border border-gray-100 shadow-sm"
              aria-label="Buka menu"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>

            <div className="min-w-0">
              <div className="text-gray-900 font-medium text-sm sm:text-base truncate">
                {activeTab === "laporan"
                  ? activeReport?.label || "Jualan"
                  : activeTab === "settings"
                    ? activeSettings?.label || "Tetapan"
                    : activeNav?.label || "Owner"}
              </div>
              <div className="hidden sm:block text-gray-400 text-xs font-medium truncate mt-0.5">
                {kedaiInfo?.nama || "Owner Dashboard"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-gray-900 text-sm font-medium leading-tight">
                {sessionUser?.nama || "Owner"}
              </div>
              <div className="text-gray-400 text-[11px] font-medium mt-0.5">
                Owner
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center text-[var(--accent-700)] font-medium">
              {userProfilePhotoUrl ? (
                <img
                  src={userProfilePhotoUrl}
                  alt={sessionUser?.nama || "Profile user"}
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-200 ${
          desktopSidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <div className="p-4 max-w-2xl mx-auto lg:max-w-5xl lg:px-6">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div>
                  <h1 className="text-gray-950 font-medium text-2xl tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-gray-400 text-sm font-medium mt-1">
                    Ringkasan operasi {kedaiInfo?.nama || "kedai"}.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <FilterBar />
                </div>
              </div>

              {stats.stokKritikal > 0 && (
                <button
                  onClick={() => setActiveTab("inventory")}
                  className="w-full mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm hover:bg-amber-100/70 active:scale-[0.99] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-amber-800 text-sm font-medium">
                          {stats.stokKritikal} menu sedang kritikal
                        </div>
                        <div className="text-amber-700 text-xs font-medium mt-1">
                          Semak dan restock item yang rendah atau habis sebelum
                          operasi terganggu.
                        </div>
                      </div>
                    </div>
                    <span className="text-amber-800 text-xs font-medium bg-white border border-amber-100 px-3 py-2 rounded-2xl shrink-0">
                      Lihat inventori
                    </span>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
                <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm min-h-[118px] sm:min-h-[124px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                        Jualan
                      </div>
                      <div className="text-gray-950 text-xl sm:text-2xl font-medium mt-3 tracking-tight">
                        {formatRM(stats.jumlahJualan)}
                      </div>
                      <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                        {filterLabel()}
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                      <DollarSign size={18} strokeWidth={2} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm min-h-[118px] sm:min-h-[124px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                        Untung
                      </div>
                      <div className="text-gray-950 text-xl sm:text-2xl font-medium mt-3 tracking-tight">
                        {formatRM(stats.jumlahUntung)}
                      </div>
                      <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                        Margin {stats.jumlahMargin}%
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center">
                      <TrendingUp size={18} strokeWidth={2} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm min-h-[118px] sm:min-h-[124px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                        Pesanan
                      </div>
                      <div className="text-gray-950 text-xl sm:text-2xl font-medium mt-3 tracking-tight">
                        {stats.jumlahTransaksi}
                      </div>
                      <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                        Order berbayar
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <Receipt size={18} strokeWidth={2} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm min-h-[118px] sm:min-h-[124px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                        Menu
                      </div>
                      <div className="text-gray-950 text-xl sm:text-2xl font-medium mt-3 tracking-tight">
                        {produk.length}
                      </div>
                      <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                        Menu aktif
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                      <Utensils size={18} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-4 overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="text-gray-900 font-medium text-sm">
                      Graf Jualan
                    </div>
                    <div className="text-gray-400 text-xs font-medium mt-1">
                      Trend jualan ikut pilihan harian, mingguan atau bulanan.
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-1 flex items-center gap-1 shrink-0">
                    {(
                      [
                        { id: "daily", label: "Daily" },
                        { id: "weekly", label: "Weekly" },
                        { id: "monthly", label: "Monthly" },
                      ] as { id: FilterType; label: string }[]
                    ).map((option) => (
                      <button
                        key={`dashboard-chart-filter-${option.id}`}
                        onClick={() => applyQuickFilter(option.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${
                          filter === option.id
                            ? "bg-[var(--accent-600)] text-white shadow-sm"
                            : "text-gray-400 hover:text-gray-700 hover:bg-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {reportData.salesTrend.length === 0 ||
                reportData.salesTrend.every(
                  (item) => Number(item.total || 0) <= 0,
                ) ? (
                  <div className="h-64 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-center p-6">
                    <div>
                      <BarChart2
                        size={34}
                        className="text-gray-300 mx-auto mb-3"
                      />
                      <div className="text-gray-400 text-sm font-medium">
                        Belum ada jualan untuk filter ini.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const chartData = reportData.salesTrend;
                      const maxSales = Math.max(
                        ...chartData.map((item) => Number(item.total || 0)),
                        1,
                      );
                      const totalSalesSelected = chartData.reduce(
                        (sum, item) => sum + Number(item.total || 0),
                        0,
                      );
                      const totalOrdersSelected = chartData.reduce(
                        (sum, item) => sum + Number(item.orders || 0),
                        0,
                      );
                      const width = 720;
                      const height = 270;
                      const padX = 34;
                      const padTop = 34;
                      const chartHeight = 160;
                      const baseY = padTop + chartHeight;
                      const points = chartData.map((item, index) => {
                        const x =
                          chartData.length === 1
                            ? width / 2
                            : padX +
                              (index / (chartData.length - 1)) *
                                (width - padX * 2);
                        const y =
                          padTop +
                          (1 - Number(item.total || 0) / maxSales) *
                            chartHeight;

                        return {
                          ...item,
                          x,
                          y,
                          value: Number(item.total || 0),
                        };
                      });
                      const linePath = points
                        .map(
                          (point, index) =>
                            `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
                        )
                        .join(" ");
                      const areaPath = points.length
                        ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
                        : "";
                      const peakPoint = points.reduce(
                        (selected, point) =>
                          point.value > selected.value ? point : selected,
                        points[0],
                      );
                      const labelIndexes = new Set([
                        0,
                        Math.floor((points.length - 1) / 2),
                        points.length - 1,
                      ]);

                      return (
                        <>
                          <div className="relative h-72 rounded-3xl bg-gray-50 border border-gray-100 px-3 pt-4 pb-2 overflow-hidden">
                            <svg
                              viewBox={`0 0 ${width} ${height}`}
                              className="w-full h-full"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient
                                  id="dashboardOwnerSalesArea"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="var(--accent-500)"
                                    stopOpacity="0.18"
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="var(--accent-500)"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                              </defs>

                              {[0, 1, 2, 3].map((grid) => {
                                const gridY = padTop + (grid / 3) * chartHeight;
                                return (
                                  <line
                                    key={`dashboard-line-grid-${grid}`}
                                    x1={padX}
                                    y1={gridY}
                                    x2={width - padX}
                                    y2={gridY}
                                    stroke="#e5e7eb"
                                    strokeWidth="1"
                                    strokeDasharray="5 7"
                                  />
                                );
                              })}

                              {areaPath && (
                                <path
                                  d={areaPath}
                                  fill="url(#dashboardOwnerSalesArea)"
                                />
                              )}

                              {linePath && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="var(--accent-600)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}

                              {points.map((point, index) => (
                                <g key={`dashboard-sales-point-${point.label}-${index}`}>
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={point.value > 0 ? "5" : "0"}
                                    fill="white"
                                    stroke="var(--accent-600)"
                                    strokeWidth="3"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                  {labelIndexes.has(index) && (
                                    <text
                                      x={point.x}
                                      y={height - 25}
                                      textAnchor="middle"
                                      fontSize="13"
                                      fontWeight="700"
                                      fill="#9ca3af"
                                    >
                                      {point.label}
                                    </text>
                                  )}
                                </g>
                              ))}

                              {peakPoint && peakPoint.value > 0 && (
                                <g>
                                  <line
                                    x1={peakPoint.x}
                                    y1={peakPoint.y + 8}
                                    x2={peakPoint.x}
                                    y2={baseY}
                                    stroke="var(--accent-500)"
                                    strokeWidth="1"
                                    strokeDasharray="4 5"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                  <circle
                                    cx={peakPoint.x}
                                    cy={peakPoint.y}
                                    r="7"
                                    fill="white"
                                    stroke="var(--accent-600)"
                                    strokeWidth="3"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </g>
                              )}
                            </svg>

                            {peakPoint && peakPoint.value > 0 && (
                              <div
                                className="absolute -translate-x-1/2 -translate-y-full bg-[var(--accent-600)] text-white text-[10px] font-medium px-3 py-2 rounded-xl shadow-lg"
                                style={{
                                  left: `${(peakPoint.x / width) * 100}%`,
                                  top: `${Math.max((peakPoint.y / height) * 100, 18)}%`,
                                }}
                              >
                                {formatRM(peakPoint.value)}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                            <div className="rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] p-3">
                              <div className="text-[var(--accent-700)] text-[10px] font-medium">
                                Total
                              </div>
                              <div className="text-[var(--accent-800)] text-sm font-medium mt-1">
                                {formatRM(totalSalesSelected)}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                              <div className="text-gray-400 text-[10px] font-medium">
                                Pesanan
                              </div>
                              <div className="text-gray-900 text-sm font-medium mt-1">
                                {totalOrdersSelected}
                              </div>
                            </div>
                            <div className="hidden sm:block rounded-2xl bg-gray-50 border border-gray-100 p-3">
                              <div className="text-gray-400 text-[10px] font-medium">
                                Peak
                              </div>
                              <div className="text-gray-900 text-sm font-medium mt-1">
                                {formatRM(maxSales)}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-900 font-medium text-sm">
                        Pesanan Hari Ini
                      </div>
                      <div className="text-gray-400 text-xs font-medium mt-1">
                        Order berbayar untuk hari ini
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <ShoppingCart size={18} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                        <div className="text-gray-400 text-[10px] font-medium">
                          Order
                        </div>
                        <div className="text-gray-950 text-2xl font-medium mt-1">
                          {reportData.todayReceipts.length}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] p-3">
                        <div className="text-[var(--accent-700)] text-[10px] font-medium">
                          Sales
                        </div>
                        <div className="text-[var(--accent-800)] text-sm font-medium mt-2">
                          {formatRM(
                            reportData.todayReceipts.reduce(
                              (sum, receipt) =>
                                sum + Number(receipt.total || 0),
                              0,
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {reportData.todayReceipts.length === 0 ? (
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center text-gray-400 text-sm font-medium">
                          Belum ada pesanan hari ini.
                        </div>
                      ) : (
                        reportData.todayReceipts.slice(0, 5).map((receipt) => (
                          <button
                            key={`dashboard-today-${receipt.id}`}
                            onClick={() => setSelectedReceipt(receipt)}
                            className="w-full flex items-center justify-between gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-3 text-left hover:bg-gray-100 transition-all"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-medium text-gray-900 truncate">
                                ORD-{receipt.id.slice(0, 8).toUpperCase()}
                              </div>
                              <div className="text-gray-400 text-xs font-medium mt-1 truncate">
                                {displayMejaLabel(receipt.meja)}
                              </div>
                            </div>
                            <div className="text-gray-900 text-xs font-medium shrink-0">
                              {formatRM(receipt.total)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <div className="text-gray-900 font-medium text-sm">
                        5 Menu Terbaik
                      </div>
                      <div className="text-gray-400 text-xs font-medium mt-1">
                        Menu paling laris {filterLabel().toLowerCase()}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[var(--accent-50)] text-[var(--accent-600)] border border-[var(--accent-100)] flex items-center justify-center">
                      <BarChart2 size={18} strokeWidth={2} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reportData.topProducts.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center text-gray-400 text-sm font-medium">
                        Tiada menu terjual untuk tempoh ini.
                      </div>
                    ) : (
                      reportData.topProducts
                        .slice(0, 5)
                        .map((product, index) => {
                          const maxQty = Math.max(
                            ...reportData.topProducts.map((p) =>
                              Number(p.qty || 0),
                            ),
                            1,
                          );
                          const width = Math.max(
                            (Number(product.qty || 0) / maxQty) * 100,
                            6,
                          );

                          return (
                            <div key={`dashboard-top-${product.nama}-${index}`}>
                              <div className="flex items-center justify-between gap-3 text-sm mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium flex items-center justify-center shrink-0">
                                    {index + 1}
                                  </span>
                                  <span className="text-gray-900 font-medium truncate">
                                    {product.nama}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-gray-900 text-xs font-medium">
                                    {formatRM(Number(product.total || 0))}
                                  </div>
                                  <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                    {product.qty} unit
                                  </div>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden ml-8">
                                <div
                                  className="h-full rounded-full bg-[var(--accent-500)]"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MENU / INVENTORY */}
          {activeTab === "inventory" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-gray-900 font-medium text-xl">
                    {activeInventory?.label || "Menu"}
                  </h2>
                  <p className="text-gray-400 text-xs font-medium mt-1">
                    {activeInventory?.description ||
                      "Urus menu, kategori, stok dan rekod pergerakan menu kedai."}
                  </p>
                </div>

                {activeInventoryTab === "inventory" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openManageCategories}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-[var(--accent-200)] text-[var(--accent-700)] text-xs font-medium px-4 py-2.5 rounded-2xl shadow-sm hover:bg-[var(--accent-50)] active:scale-95 transition-all"
                    >
                      <FolderTree size={14} strokeWidth={2} />
                      <span className="hidden sm:inline">Kategori</span>
                    </button>

                    <button
                      onClick={() => setShowAddProduk(true)}
                      className="inline-flex items-center justify-center gap-2 bg-[var(--accent-600)] text-white text-xs font-medium px-4 py-2.5 rounded-2xl shadow-sm hover:bg-[var(--accent-700)] active:scale-95 transition-all"
                    >
                      <Plus size={14} strokeWidth={2.2} />
                      Tambah Menu
                    </button>
                  </div>
                )}
              </div>

              {activeInventoryTab === "inventory" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-sm min-h-[124px]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                            Menu Aktif
                          </div>
                          <div className="text-gray-950 text-2xl font-medium mt-2 tracking-tight">
                            {produk.length}
                          </div>
                          <div className="text-gray-400 text-xs font-medium mt-2">
                            Menu tersedia
                          </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm">
                          <Utensils size={19} strokeWidth={2} />
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-sm min-h-[124px]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                            Stok Rendah
                          </div>
                          <div className="text-gray-950 text-2xl font-medium mt-2 tracking-tight">
                            {
                              produk.filter(
                                (product) =>
                                  Number(product.stok || 0) > 0 &&
                                  Number(product.stok || 0) <= 5,
                              ).length
                            }
                          </div>
                          <div className="text-gray-400 text-xs font-medium mt-2">
                            Perlu restock
                          </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-sm">
                          <AlertTriangle size={19} strokeWidth={2} />
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 p-5 shadow-sm min-h-[124px]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-gray-500 text-[10px] sm:text-xs font-medium">
                            Habis
                          </div>
                          <div className="text-gray-950 text-2xl font-medium mt-2 tracking-tight">
                            {
                              produk.filter(
                                (product) => Number(product.stok || 0) <= 0,
                              ).length
                            }
                          </div>
                          <div className="text-gray-400 text-xs font-medium mt-2">
                            Tidak boleh dijual
                          </div>
                        </div>
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shadow-sm">
                          <X size={19} strokeWidth={2} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-50">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <div className="text-gray-900 text-sm font-medium flex items-center gap-2">
                            <Utensils
                              size={16}
                              className="text-[var(--accent-600)]"
                            />
                            Inventori Menu
                          </div>
                          <div className="text-gray-400 text-xs font-medium mt-1">
                            {filteredProduk.length} daripada {produk.length}{" "}
                            menu dipaparkan
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative">
                            <Search
                              size={15}
                              strokeWidth={2}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                              type="text"
                              value={inventorySearch}
                              onChange={(event) =>
                                setInventorySearch(event.target.value)
                              }
                              placeholder="Cari menu atau kategori..."
                              className="w-full sm:w-72 border border-gray-200 bg-white rounded-2xl pl-10 pr-4 py-3 text-gray-900 text-xs font-medium outline-none focus:border-[var(--accent-500)]"
                            />
                          </div>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowCategoryFilterDropdown((value) => !value)
                              }
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-2xl text-xs font-medium shadow-sm hover:border-[var(--accent-300)] hover:bg-[var(--accent-50)] active:scale-95 transition-all"
                            >
                              <Tag
                                size={14}
                                className="text-[var(--accent-600)]"
                              />
                              <span>{categoryFilterLabel()}</span>
                              <ChevronDown
                                size={12}
                                className="text-gray-400"
                              />
                            </button>

                            {showCategoryFilterDropdown && (
                              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-40 overflow-hidden p-2 max-h-72 overflow-y-auto">
                                <button
                                  onClick={() => applyCategoryFilter("all")}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                                    selectedCategoryFilter === "all"
                                      ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                                      : "text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Utensils
                                      size={15}
                                      className="text-gray-400"
                                    />
                                    Semua Kategori
                                  </span>
                                  {selectedCategoryFilter === "all" && (
                                    <CircleCheck
                                      size={14}
                                      className="text-[var(--accent-600)]"
                                    />
                                  )}
                                </button>

                                {categories.map((category) => (
                                  <button
                                    key={`filter-${category.id}`}
                                    onClick={() =>
                                      applyCategoryFilter(category.id)
                                    }
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                                      selectedCategoryFilter === category.id
                                        ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                                        : category.is_active
                                          ? "text-gray-600 hover:bg-gray-50"
                                          : "text-gray-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <CategoryIcon
                                        value={category.icon}
                                        size={15}
                                        className="shrink-0"
                                      />
                                      <span className="truncate">
                                        {category.nama}
                                      </span>
                                    </span>
                                    {selectedCategoryFilter === category.id && (
                                      <CircleCheck
                                        size={14}
                                        className="text-[var(--accent-600)]"
                                      />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {produk.length === 0 ? (
                      <div className="p-10 text-center">
                        <BoxOpen
                          size={36}
                          className="text-gray-300 mx-auto mb-3"
                        />
                        <div className="text-gray-900 text-sm font-medium">
                          Belum ada menu lagi
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          Tambah menu pertama untuk mula urus inventori.
                        </div>
                      </div>
                    ) : filteredProduk.length === 0 ? (
                      <div className="p-10 text-center">
                        <Search
                          size={36}
                          className="text-gray-300 mx-auto mb-3"
                        />
                        <div className="text-gray-900 text-sm font-medium">
                          Tiada menu dijumpai
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          Cuba tukar keyword search atau kategori filter.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="hidden lg:block">
                          <table className="w-full table-fixed text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="w-[5%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  No
                                </th>
                                <th className="w-[26%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Menu
                                </th>
                                <th className="w-[13%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  ID
                                </th>
                                <th className="w-[18%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Kategori
                                </th>
                                <th className="w-[12%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Harga
                                </th>
                                <th className="w-[10%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Kos
                                </th>
                                <th className="w-[10%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Margin
                                </th>
                                <th className="w-[11%] px-3 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {filteredProduk.map((p, index) => {
                                const margin = getProductMargin(p);
                                const category = resolveProductCategory(p);
                                return (
                                  <tr
                                    key={p.id}
                                    className="hover:bg-gray-50/70 transition-all"
                                  >
                                    <td className="px-3 py-4 text-gray-500 font-medium">
                                      {String(index + 1).padStart(2, "0")}
                                    </td>
                                    <td className="px-3 py-4">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[var(--accent-600)] shrink-0">
                                          <CategoryIcon
                                            value={category.icon}
                                            size={16}
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-gray-900 font-medium truncate">
                                            {p.nama}
                                          </div>
                                          <div className="text-gray-400 text-xs font-medium mt-0.5">
                                            {p.is_active
                                              ? "Aktif"
                                              : "Tidak aktif"}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-4">
                                      <span className="font-mono text-xs font-medium text-gray-500">
                                        {getProductDisplayId(p)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-4">
                                      <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-lg">
                                        <CategoryIcon
                                          value={category.icon}
                                          size={13}
                                        />
                                        {category.nama}
                                      </span>
                                    </td>
                                    <td className="px-3 py-4 text-right text-gray-900 font-medium">
                                      {formatRM(p.harga_jual)}
                                    </td>
                                    <td className="px-3 py-4 text-right text-gray-600 font-medium">
                                      {formatRM(p.kos_produk)}
                                    </td>
                                    <td
                                      className={`px-3 py-4 text-right font-medium ${margin >= 40 ? "text-[var(--accent-600)]" : "text-amber-500"}`}
                                    >
                                      {margin}%
                                    </td>

                                    <td className="px-3 py-4">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => openEditProduk(p)}
                                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all"
                                          title="Edit menu"
                                          aria-label="Edit menu"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setConfirmDeleteProdukId(p.id);
                                            setConfirmDeleteProdukNama(p.nama);
                                          }}
                                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                                          title="Buang menu"
                                          aria-label="Buang menu"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="lg:hidden p-4 space-y-3">
                          {filteredProduk.map((p, index) => {
                            const margin = getProductMargin(p);
                            const category = resolveProductCategory(p);
                            return (
                              <div
                                key={p.id}
                                className="bg-gray-50 rounded-3xl p-4 border border-gray-100"
                              >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-[var(--accent-600)] shrink-0">
                                      <CategoryIcon
                                        value={category.icon}
                                        size={19}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-xs font-medium">
                                          {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span className="font-mono text-[11px] font-medium text-gray-400">
                                          {getProductDisplayId(p)}
                                        </span>
                                      </div>
                                      <div className="text-gray-900 font-medium truncate mt-0.5">
                                        {p.nama}
                                      </div>
                                      <div className="inline-flex items-center gap-1.5 bg-white border border-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full mt-2">
                                        <CategoryIcon
                                          value={category.icon}
                                          size={12}
                                        />
                                        {category.nama}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <div className="text-center bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-gray-900 text-sm font-medium">
                                      {formatRM(p.harga_jual)}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Harga
                                    </div>
                                  </div>
                                  <div className="text-center bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-gray-900 text-sm font-medium">
                                      {formatRM(p.kos_produk)}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Kos
                                    </div>
                                  </div>
                                  <div className="text-center bg-white rounded-2xl p-3 border border-gray-100">
                                    <div
                                      className={`text-sm font-medium ${margin >= 40 ? "text-[var(--accent-600)]" : "text-amber-500"}`}
                                    >
                                      {margin}%
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Margin
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                  <div />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEditProduk(p)}
                                      className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all"
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmDeleteProdukId(p.id);
                                        setConfirmDeleteProdukNama(p.nama);
                                      }}
                                      className="w-9 h-9 bg-red-50 text-red-500 border border-red-100 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                      aria-label="Buang menu"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {activeInventoryTab === "summary" && (
                <div className="space-y-4">
                  <FilterBar />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                      <div className="text-gray-400 text-[10px] font-medium">
                        Menu Aktif
                      </div>
                      <div className="text-gray-950 text-2xl font-medium mt-2">
                        {produk.length}
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                      <div className="text-gray-400 text-[10px] font-medium">
                        Stok Masuk
                      </div>
                      <div className="text-[var(--accent-700)] text-2xl font-medium mt-2">
                        +{reportData.stockInTotal}
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                      <div className="text-gray-400 text-[10px] font-medium">
                        Stok Keluar
                      </div>
                      <div className="text-red-500 text-2xl font-medium mt-2">
                        -{reportData.stockOutTotal}
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                      <div className="text-gray-400 text-[10px] font-medium">
                        Stok Kritikal
                      </div>
                      <div className="text-amber-600 text-2xl font-medium mt-2">
                        {
                          produk.filter(
                            (product) => Number(product.stok || 0) <= 5,
                          ).length
                        }
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50">
                      <h3 className="text-gray-900 font-medium text-sm flex items-center gap-2">
                        <ClipboardList
                          size={16}
                          className="text-[var(--accent-600)]"
                        />
                        Rumusan Menu
                      </h3>
                      <p className="text-gray-400 text-xs font-medium mt-1">
                        Stok awal, masuk, keluar dan akhir ikut filter tarikh.
                      </p>
                    </div>

                    {reportData.inventorySummary.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm font-medium">
                        Belum ada menu aktif.
                      </div>
                    ) : (
                      <>
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Menu
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Stok Awal
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Masuk
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Keluar
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Stok Akhir
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {reportData.inventorySummary.map((item) => {
                                const status =
                                  item.stokAkhir <= 0
                                    ? "Habis"
                                    : item.stokAkhir <= 5
                                      ? "Stok Rendah"
                                      : "Stok OK";
                                const badgeClass =
                                  item.stokAkhir <= 0
                                    ? "bg-red-50 text-red-600 border-red-100"
                                    : item.stokAkhir <= 5
                                      ? "bg-amber-50 text-amber-700 border-amber-100"
                                      : "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]";
                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-gray-50/70"
                                  >
                                    <td className="px-4 py-4 text-gray-900 font-medium max-w-[260px] truncate">
                                      {item.nama}
                                    </td>
                                    <td className="px-4 py-4 text-right text-gray-600 font-medium">
                                      {item.stokAwal}
                                    </td>
                                    <td className="px-4 py-4 text-right text-[var(--accent-700)] font-medium">
                                      +{item.stockIn}
                                    </td>
                                    <td className="px-4 py-4 text-right text-red-500 font-medium">
                                      -{item.stockOut}
                                    </td>
                                    <td className="px-4 py-4 text-right text-gray-950 font-medium">
                                      {item.stokAkhir}
                                    </td>
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex px-3 py-1.5 rounded-full border text-xs font-medium ${badgeClass}`}
                                      >
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="lg:hidden p-4 space-y-3">
                          {reportData.inventorySummary.map((item) => {
                            const status =
                              item.stokAkhir <= 0
                                ? "Habis"
                                : item.stokAkhir <= 5
                                  ? "Stok Rendah"
                                  : "Stok OK";
                            const badgeClass =
                              item.stokAkhir <= 0
                                ? "bg-red-50 text-red-600 border-red-100"
                                : item.stokAkhir <= 5
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]";
                            return (
                              <div
                                key={item.id}
                                className="bg-gray-50 border border-gray-100 rounded-3xl p-4"
                              >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                  <div className="text-gray-900 text-sm font-medium truncate">
                                    {item.nama}
                                  </div>
                                  <span
                                    className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-medium ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  <div className="bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-gray-900 text-sm font-medium">
                                      {item.stokAwal}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Awal
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-[var(--accent-700)] text-sm font-medium">
                                      +{item.stockIn}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Masuk
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-red-500 text-sm font-medium">
                                      -{item.stockOut}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Keluar
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-2xl p-3 border border-gray-100">
                                    <div className="text-gray-900 text-sm font-medium">
                                      {item.stokAkhir}
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-1">
                                      Akhir
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeInventoryTab === "records" && (
                <div className="space-y-4">
                  <FilterBar />
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm flex items-center gap-2">
                          <History
                            size={16}
                            className="text-[var(--accent-600)]"
                          />
                          Rekod Menu
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Auto = stok keluar bila order dibayar. Manual =
                          restock, buang atau adjustment.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[var(--accent-50)] text-[var(--accent-700)] border border-[var(--accent-100)] rounded-full px-3 py-1.5 text-[10px] font-medium">
                          Auto
                        </span>
                        <span className="bg-gray-50 text-gray-600 border border-gray-100 rounded-full px-3 py-1.5 text-[10px] font-medium">
                          Manual
                        </span>
                      </div>
                    </div>

                    {reportData.stockMovements.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm font-medium">
                        Belum ada rekod menu dalam tempoh ini.
                      </div>
                    ) : (
                      <>
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Tarikh
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Item
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Jenis
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Kuantiti
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Sebab
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Auto/Manual
                                </th>
                                <th className="px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Oleh
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {paginatedStockMovements.map((item) => {
                                const isIn = isStockInMovement(item.type);
                                const sourceLabel = formatMovementSource(
                                  item.source,
                                  item.order_id,
                                );
                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-gray-50/70"
                                  >
                                    <td className="px-4 py-4 text-gray-500 font-medium whitespace-nowrap">
                                      {formatReceiptDate(item.created_at)}
                                    </td>
                                    <td className="px-4 py-4 text-gray-900 font-medium max-w-[220px] truncate">
                                      {item.produk_nama}
                                    </td>
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium border ${isIn ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]" : "bg-red-50 text-red-600 border-red-100"}`}
                                      >
                                        {formatMovementShortType(item.type)}
                                      </span>
                                    </td>
                                    <td
                                      className={`px-4 py-4 text-right font-medium ${isIn ? "text-[var(--accent-700)]" : "text-red-500"}`}
                                    >
                                      {isIn ? "+" : "-"}
                                      {item.qty}
                                    </td>
                                    <td className="px-4 py-4 text-gray-600 font-medium max-w-[240px] truncate">
                                      {item.reason || "-"}
                                    </td>
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium border ${sourceLabel === "Auto" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-600 border-gray-100"}`}
                                      >
                                        {sourceLabel}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-gray-700 font-medium max-w-[160px] truncate">
                                      {formatMovementActor(item)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="lg:hidden p-4 space-y-3">
                          {paginatedStockMovements.map((item) => {
                            const isIn = isStockInMovement(item.type);
                            const sourceLabel = formatMovementSource(
                              item.source,
                              item.order_id,
                            );
                            return (
                              <div
                                key={item.id}
                                className="bg-gray-50 border border-gray-100 rounded-3xl p-4"
                              >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="min-w-0">
                                    <div className="text-gray-900 text-sm font-medium truncate">
                                      {item.produk_nama}
                                    </div>
                                    <div className="text-gray-400 text-xs font-medium mt-1">
                                      {formatReceiptDate(item.created_at)}
                                    </div>
                                  </div>
                                  <div
                                    className={`shrink-0 text-sm font-medium ${isIn ? "text-[var(--accent-700)]" : "text-red-500"}`}
                                  >
                                    {isIn ? "+" : "-"}
                                    {item.qty}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium border ${isIn ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]" : "bg-red-50 text-red-600 border-red-100"}`}
                                  >
                                    {formatMovementShortType(item.type)}
                                  </span>
                                  <span
                                    className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium border ${sourceLabel === "Auto" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-600 border-gray-100"}`}
                                  >
                                    {sourceLabel}
                                  </span>
                                  <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium bg-white border border-gray-100 text-gray-500">
                                    Oleh: {formatMovementActor(item)}
                                  </span>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl p-3">
                                  <div className="text-gray-400 text-[10px] font-medium mb-1">
                                    Sebab
                                  </div>
                                  <div className="text-gray-700 text-xs font-medium">
                                    {item.reason || "-"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {reportData.stockMovements.length > RECORDS_PER_PAGE && (
                          <div className="border-t border-gray-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-gray-400 text-xs font-medium text-center sm:text-left">
                              Papar {recordsStartIndex}–{recordsEndIndex} daripada {reportData.stockMovements.length} rekod
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  setRecordsPage((page) => Math.max(1, page - 1))
                                }
                                disabled={safeRecordsPage <= 1}
                                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-all"
                              >
                                Sebelum
                              </button>
                              <div className="min-w-20 text-center px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 text-xs font-medium">
                                {safeRecordsPage} / {recordsTotalPages}
                              </div>
                              <button
                                onClick={() =>
                                  setRecordsPage((page) =>
                                    Math.min(recordsTotalPages, page + 1),
                                  )
                                }
                                disabled={safeRecordsPage >= recordsTotalPages}
                                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 active:scale-95 transition-all"
                              >
                                Seterusnya
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAPORAN */}
          {activeTab === "laporan" && (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-gray-900 font-medium text-xl">
                    {activeReport?.label || "Jualan"}
                  </h2>
                  <p className="text-gray-400 text-xs font-medium mt-1">
                    {activeReport?.description ||
                      "Rumusan jualan dan rekod resit ikut tempoh dipilih"}
                  </p>
                </div>
                <button
                  onClick={() => fetchAllData(sessionUser?.kedai_id)}
                  disabled={loadingReport}
                  className="bg-white border border-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm disabled:opacity-50"
                >
                  {loadingReport ? "Loading..." : "Refresh"}
                </button>
              </div>
              <FilterBar />
              {activeReportTab === "sales-summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] p-5 text-white shadow-sm min-h-[150px]">
                        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
                        <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-black/10" />
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center">
                            <DollarSign size={21} strokeWidth={1.9} />
                          </div>
                          <span className="bg-white/15 text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                            {filterLabel()}
                          </span>
                        </div>
                        <div className="relative z-10 mt-5">
                          <div className="text-[var(--accent-100)] text-xs font-medium">
                            Total Sales
                          </div>
                          <div className="text-white text-3xl sm:text-4xl font-medium mt-1 tracking-tight">
                            {formatRM(reportData.totalSales)}
                          </div>
                          <div className="text-[var(--accent-100)] text-xs font-medium mt-2">
                            {reportData.totalOrders} order dalam tempoh ini
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm min-h-[150px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-700 flex items-center justify-center">
                            <Receipt size={21} strokeWidth={1.9} />
                          </div>
                          <span className="bg-[var(--accent-50)] text-[var(--accent-700)] text-[11px] font-medium px-2.5 py-1 rounded-full border border-[var(--accent-100)]">
                            Avg {formatRM(reportData.averageOrderValue)}
                          </span>
                        </div>
                        <div className="mt-5">
                          <div className="text-gray-400 text-xs font-medium">
                            Total Orders
                          </div>
                          <div className="text-gray-950 text-3xl font-medium mt-1">
                            {reportData.totalOrders}
                          </div>
                          <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                            Purata nilai setiap order
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm min-h-[150px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                            <TrendingUp size={21} strokeWidth={1.9} />
                          </div>
                          <span className="bg-green-50 text-green-600 text-[11px] font-medium px-2.5 py-1 rounded-full border border-green-100">
                            {reportData.margin}% margin
                          </span>
                        </div>
                        <div className="mt-5">
                          <div className="text-gray-400 text-xs font-medium">
                            Gross Profit
                          </div>
                          <div className="text-gray-950 text-3xl font-medium mt-1">
                            {formatRM(reportData.grossProfit)}
                          </div>
                          <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                            Jualan selepas tolak kos menu
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm min-h-[150px]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                            <TrendingDown size={21} strokeWidth={1.9} />
                          </div>
                          <span className="bg-red-50 text-red-500 text-[11px] font-medium px-2.5 py-1 rounded-full border border-red-100">
                            Cost
                          </span>
                        </div>
                        <div className="mt-5">
                          <div className="text-gray-400 text-xs font-medium">
                            COGS
                          </div>
                          <div className="text-gray-950 text-3xl font-medium mt-1">
                            {formatRM(reportData.cogs)}
                          </div>
                          <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                            Anggaran kos menu terjual
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div>
                          <h3 className="text-gray-900 font-medium text-base">
                            Menu Statistic
                          </h3>
                          <p className="text-gray-400 text-xs font-medium mt-1">
                            Top menu ikut kuantiti terjual
                          </p>
                        </div>
                        <span className="text-gray-400 text-xs font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                          Top 5
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="rounded-3xl bg-[var(--accent-50)] border border-[var(--accent-100)] p-4">
                          <div className="w-10 h-10 rounded-2xl bg-white text-[var(--accent-600)] flex items-center justify-center mb-4 border border-[var(--accent-100)]">
                            <Package size={18} strokeWidth={1.9} />
                          </div>
                          <div className="text-gray-950 text-3xl font-medium leading-none">
                            {reportData.topProducts.reduce(
                              (sum, product) => sum + Number(product.qty || 0),
                              0,
                            )}
                          </div>
                          <div className="text-gray-500 text-[11px] font-medium mt-2">
                            Total unit terjual
                          </div>
                        </div>

                        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4">
                          <div className="w-10 h-10 rounded-2xl bg-white text-gray-600 flex items-center justify-center mb-4 border border-gray-100">
                            <DollarSign size={18} strokeWidth={1.9} />
                          </div>
                          <div className="text-gray-950 text-xl font-medium leading-tight">
                            {formatRM(
                              reportData.topProducts.reduce(
                                (sum, product) =>
                                  sum + Number(product.total || 0),
                                0,
                              ),
                            )}
                          </div>
                          <div className="text-gray-500 text-[11px] font-medium mt-2">
                            Sales top menu
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {reportData.topProducts.length === 0 ? (
                          <div className="text-center py-5 bg-gray-50 rounded-2xl">
                            <Package
                              size={30}
                              className="text-gray-300 mx-auto mb-2"
                            />
                            <div className="text-gray-400 text-xs font-medium">
                              Belum ada menu terjual
                            </div>
                          </div>
                        ) : (
                          reportData.topProducts
                            .slice(0, 5)
                            .map((item, index) => {
                              const totalTopQty = Math.max(
                                reportData.topProducts.reduce(
                                  (sum, product) =>
                                    sum + Number(product.qty || 0),
                                  0,
                                ),
                                1,
                              );
                              const percent = Math.round(
                                (Number(item.qty || 0) / totalTopQty) * 100,
                              );

                              return (
                                <div
                                  key={`${item.nama}-stat-${index}`}
                                  className="flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                                    <CategoryIcon value="food" size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-gray-900 text-xs font-medium truncate">
                                      {item.nama}
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                                      <div
                                        className="h-full rounded-full bg-[var(--accent-500)]"
                                        style={{
                                          width: `${Math.max(percent, 6)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-gray-900 text-xs font-medium">
                                      {item.qty} unit
                                    </div>
                                    <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                      {formatRM(Number(item.total || 0))}
                                    </div>
                                    <div className="text-[var(--accent-600)] text-[10px] font-medium bg-[var(--accent-50)] px-2 py-0.5 rounded-full mt-1 inline-block">
                                      {percent}%
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-gray-900 font-medium text-base">
                          Sales Trend
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Trend jualan dan order ikut tempoh filter
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                        {filterLabel()}
                      </span>
                    </div>

                    {reportData.salesTrend.length === 0 ||
                    reportData.salesTrend.every(
                      (item) => Number(item.total || 0) <= 0,
                    ) ? (
                      <div className="h-56 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-center p-6">
                        <div>
                          <BarChart2
                            size={34}
                            className="text-gray-300 mx-auto mb-3"
                          />
                          <div className="text-gray-400 text-sm font-medium">
                            Belum ada trend jualan untuk tempoh ini.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4 overflow-hidden">
                          {(() => {
                            const chartData = reportData.salesTrend;
                            const maxSales = Math.max(
                              ...chartData.map((trend) =>
                                Number(trend.total || 0),
                              ),
                              1,
                            );
                            const width = 560;
                            const height = 210;
                            const padX = 34;
                            const padTop = 24;
                            const chartHeight = 132;
                            const baseY = padTop + chartHeight;
                            const points = chartData.map((item, index) => {
                              const x =
                                chartData.length === 1
                                  ? width / 2
                                  : padX +
                                    (index / (chartData.length - 1)) *
                                      (width - padX * 2);
                              const y =
                                padTop +
                                (1 - Number(item.total || 0) / maxSales) *
                                  chartHeight;
                              return {
                                ...item,
                                x,
                                y,
                                totalValue: Number(item.total || 0),
                              };
                            });
                            const linePath = points
                              .map(
                                (point, index) =>
                                  `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
                              )
                              .join(" ");
                            const areaPath = points.length
                              ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
                              : "";
                            const labelIndexes = new Set([
                              0,
                              Math.floor((points.length - 1) / 2),
                              points.length - 1,
                            ]);

                            return (
                              <div>
                                <div className="relative h-56">
                                  <svg
                                    viewBox={`0 0 ${width} ${height}`}
                                    className="w-full h-full"
                                    preserveAspectRatio="none"
                                  >
                                    <defs>
                                      <linearGradient
                                        id="ownerSalesTrendArea"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="0%"
                                          stopColor="var(--accent-500)"
                                          stopOpacity="0.22"
                                        />
                                        <stop
                                          offset="100%"
                                          stopColor="var(--accent-500)"
                                          stopOpacity="0"
                                        />
                                      </linearGradient>
                                    </defs>

                                    {[0, 1, 2, 3].map((grid) => {
                                      const gridY =
                                        padTop + (grid / 3) * chartHeight;
                                      return (
                                        <line
                                          key={`grid-${grid}`}
                                          x1={padX}
                                          y1={gridY}
                                          x2={width - padX}
                                          y2={gridY}
                                          stroke="#e5e7eb"
                                          strokeWidth="1"
                                          strokeDasharray="5 7"
                                        />
                                      );
                                    })}

                                    {areaPath && (
                                      <path
                                        d={areaPath}
                                        fill="url(#ownerSalesTrendArea)"
                                      />
                                    )}
                                    {linePath && (
                                      <path
                                        d={linePath}
                                        fill="none"
                                        stroke="var(--accent-600)"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    )}

                                    {points.map((point, index) => (
                                      <g key={`${point.label}-${index}`}>
                                        <circle
                                          cx={point.x}
                                          cy={point.y}
                                          r="6"
                                          fill="white"
                                          stroke="var(--accent-600)"
                                          strokeWidth="4"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        {labelIndexes.has(index) && (
                                          <text
                                            x={point.x}
                                            y={height - 22}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fontWeight="800"
                                            fill="#9ca3af"
                                          >
                                            {point.label}
                                          </text>
                                        )}
                                      </g>
                                    ))}
                                  </svg>

                                  <div className="absolute left-3 top-3 bg-white/90 backdrop-blur border border-gray-100 rounded-2xl px-3 py-2 shadow-sm">
                                    <div className="text-gray-400 text-[10px] font-medium">
                                      Peak Sales
                                    </div>
                                    <div className="text-gray-900 text-sm font-medium mt-0.5">
                                      {formatRM(maxSales)}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-gray-400">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-600)]" />
                                    <span>Sales amount</span>
                                  </div>
                                  <div className="text-gray-500">
                                    {chartData.reduce(
                                      (sum, item) =>
                                        sum + Number(item.orders || 0),
                                      0,
                                    )}{" "}
                                    order
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                          <div className="rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] p-3">
                            <div className="text-[var(--accent-700)] text-[10px] font-medium">
                              Peak Sales
                            </div>
                            <div className="text-[var(--accent-800)] text-sm font-medium mt-1">
                              {formatRM(
                                Math.max(
                                  ...reportData.salesTrend.map((trend) =>
                                    Number(trend.total || 0),
                                  ),
                                  0,
                                ),
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                            <div className="text-gray-400 text-[10px] font-medium">
                              Total Order
                            </div>
                            <div className="text-gray-900 text-sm font-medium mt-1">
                              {reportData.salesTrend.reduce(
                                (sum, trend) => sum + Number(trend.orders || 0),
                                0,
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-green-50 border border-green-100 p-3">
                            <div className="text-green-600 text-[10px] font-medium">
                              Gross Profit
                            </div>
                            <div className="text-green-700 text-sm font-medium mt-1">
                              {formatRM(reportData.grossProfit)}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
                            <div className="text-red-500 text-[10px] font-medium">
                              COGS
                            </div>
                            <div className="text-red-600 text-sm font-medium mt-1">
                              {formatRM(reportData.cogs)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div>
                          <h3 className="text-gray-900 font-medium text-base">
                            Order Habits
                          </h3>
                          <p className="text-gray-400 text-xs font-medium mt-1">
                            Pecahan dine-in, bungkus dan nilai order
                          </p>
                        </div>
                        <span className="text-gray-400 text-xs font-medium bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                          {filterLabel()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 rounded-3xl bg-gray-50 border border-gray-100 p-4">
                          <div className="space-y-5">
                            {[
                              {
                                label: "Dine-in",
                                value: reportData.dineInOrders,
                                total: Math.max(reportData.totalOrders, 1),
                                icon: Store,
                              },
                              {
                                label: "Bungkus",
                                value: reportData.takeawayOrders,
                                total: Math.max(reportData.totalOrders, 1),
                                icon: ShoppingCart,
                              },
                              {
                                label: "Order Direkod",
                                value: reportData.totalOrders,
                                total: Math.max(reportData.totalOrders, 1),
                                icon: Receipt,
                              },
                            ].map((habit) => {
                              const HabitIcon = habit.icon;
                              const percent = Math.round(
                                (habit.value / habit.total) * 100,
                              );

                              return (
                                <div key={habit.label}>
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-white text-[var(--accent-600)] border border-gray-100 flex items-center justify-center shrink-0">
                                        <HabitIcon
                                          size={15}
                                          strokeWidth={1.9}
                                        />
                                      </div>
                                      <div>
                                        <div className="text-gray-900 text-sm font-medium">
                                          {habit.label}
                                        </div>
                                        <div className="text-gray-400 text-[11px] font-medium">
                                          {habit.value} order
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-gray-900 text-sm font-medium">
                                      {percent}%
                                    </div>
                                  </div>
                                  <div className="h-3 rounded-full bg-white overflow-hidden border border-gray-100">
                                    <div
                                      className="h-full rounded-full bg-[var(--accent-500)]"
                                      style={{
                                        width: `${Math.min(Math.max(percent, habit.value > 0 ? 6 : 0), 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                          <div className="rounded-3xl bg-gray-950 text-white p-4">
                            <div className="text-gray-400 text-xs font-medium">
                              Average Order
                            </div>
                            <div className="text-white text-2xl font-medium mt-2">
                              {formatRM(reportData.averageOrderValue)}
                            </div>
                            <div className="text-gray-400 text-[11px] sm:text-xs font-medium mt-2">
                              Per transaksi
                            </div>
                          </div>
                          <div className="rounded-3xl bg-[var(--accent-50)] border border-[var(--accent-100)] p-4">
                            <div className="text-[var(--accent-700)] text-xs font-medium">
                              Margin
                            </div>
                            <div className="text-[var(--accent-800)] text-2xl font-medium mt-2">
                              {reportData.margin}%
                            </div>
                            <div className="text-[var(--accent-600)] text-xs font-medium mt-2">
                              Gross profit rate
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <div>
                          <h3 className="text-gray-900 font-medium text-base">
                            Payment Method
                          </h3>
                          <p className="text-gray-400 text-xs font-medium mt-1">
                            Pecahan kaedah bayaran
                          </p>
                        </div>
                        <CreditCard size={19} className="text-blue-500" />
                      </div>

                      <div className="space-y-3">
                        {reportData.paymentSummary.length === 0 ? (
                          <div className="text-center py-7 bg-gray-50 rounded-2xl">
                            <CreditCard
                              size={30}
                              className="text-gray-300 mx-auto mb-2"
                            />
                            <div className="text-gray-400 text-xs font-medium">
                              Belum ada rekod bayaran
                            </div>
                          </div>
                        ) : (
                          reportData.paymentSummary.map((item) => {
                            const percent = Math.round(
                              (Number(item.total || 0) /
                                Math.max(reportData.totalSales, 1)) *
                                100,
                            );

                            return (
                              <div
                                key={`payment-r1-${item.method}`}
                                className="rounded-2xl bg-gray-50 border border-gray-100 p-3"
                              >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div>
                                    <div className="text-gray-900 text-sm font-medium">
                                      {item.method}
                                    </div>
                                    <div className="text-gray-400 text-xs font-medium">
                                      {item.count} order
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-gray-900 text-sm font-medium">
                                      {formatRM(item.total)}
                                    </div>
                                    <div className="text-[var(--accent-600)] text-[10px] font-medium">
                                      {percent}%
                                    </div>
                                  </div>
                                </div>
                                <div className="h-2 rounded-full bg-white overflow-hidden border border-gray-100">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{
                                      width: `${Math.min(Math.max(percent, 6), 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden">
                    <div className="p-5 border-b border-gray-50 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-gray-900 font-medium text-base">
                          Recent Receipts
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Transaksi terbaru dalam filter semasa
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveReportTab("receipts")}
                        className="bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-medium px-3 py-2 rounded-xl hover:bg-[var(--accent-100)] transition-all"
                      >
                        View all
                      </button>
                    </div>

                    {reportData.recentReceipts.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm font-medium">
                        Tiada receipt untuk tempoh ini.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {reportData.recentReceipts
                          .slice(0, 5)
                          .map((receipt) => (
                            <button
                              key={`recent-r1-${receipt.id}`}
                              onClick={() => setSelectedReceipt(receipt)}
                              className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-[var(--accent-600)]">
                                  <Receipt size={17} strokeWidth={1.9} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-medium text-gray-900 truncate">
                                    #{receipt.id.slice(0, 8).toUpperCase()}
                                  </div>
                                  <div className="text-gray-400 text-xs font-medium mt-1 truncate">
                                    {displayMejaLabel(receipt.meja)} ·{" "}
                                    {formatReceiptDate(receipt.created_at)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-gray-900 text-sm font-medium">
                                  {formatRM(receipt.total)}
                                </div>
                                <div className="text-[var(--accent-700)] bg-[var(--accent-50)] border border-[var(--accent-100)] rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 inline-block">
                                  {receipt.payment_method || "Paid"}
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeReportTab === "top-products" && (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-medium text-sm">
                        <Flame size={15} className="text-orange-500" /> Top
                        Product
                      </h3>
                      <span className="text-gray-400 text-xs font-medium">
                        Top 5
                      </span>
                    </div>
                    {reportData.topProducts.length === 0 ? (
                      <div className="text-center py-6">
                        <Utensils
                          size={34}
                          className="text-gray-300 mx-auto mb-2"
                        />
                        <div className="text-gray-400 text-sm">
                          Belum ada menu terjual
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reportData.topProducts.map((item, index) => (
                          <div
                            key={`${item.nama}-${index}`}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-medium ${index === 0 ? "bg-[var(--accent-600)] text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 font-medium text-sm truncate">
                                {item.nama}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {item.qty} terjual
                              </div>
                            </div>
                            <div className="text-gray-900 text-sm font-medium">
                              {formatRM(item.total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeReportTab === "payment-method" && (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-medium text-sm">
                        <CreditCard size={15} className="text-blue-500" />{" "}
                        Payment Method
                      </h3>
                      <span className="text-gray-400 text-xs font-medium">
                        {reportData.paymentSummary.length} jenis
                      </span>
                    </div>
                    {reportData.paymentSummary.length === 0 ? (
                      <div className="text-center py-6">
                        <CreditCard
                          size={34}
                          className="text-gray-300 mx-auto mb-2"
                        />
                        <div className="text-gray-400 text-sm">
                          Belum ada rekod bayaran
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reportData.paymentSummary.map((item) => (
                          <div
                            key={item.method}
                            className="flex items-center justify-between bg-gray-50 rounded-2xl p-3"
                          >
                            <div>
                              <div className="text-gray-900 text-sm font-medium">
                                {item.method}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {item.count} order
                              </div>
                            </div>
                            <div className="text-[var(--accent-600)] text-sm font-medium">
                              {formatRM(item.total)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {reportData.paymentSummary.some(
                      (p) => p.method === "Belum direkod",
                    ) && (
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                        <div className="text-amber-700 text-xs font-medium">
                          <AlertTriangle size={14} className="inline mr-1" />
                          Ada order yang payment method belum disimpan. Pastikan
                          staff pilih Tunai atau DuitNow masa checkout.
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeReportTab === "inventory-summary" && (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm">
                          <BarChart2
                            size={15}
                            className="text-[var(--accent-600)]"
                          />{" "}
                          Ringkasan Stok
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Stok awal, masuk, keluar dan akhir ikut filter tarikh
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs font-medium">
                        {reportData.inventorySummary.length} menu
                      </span>
                    </div>
                    {reportData.inventorySummary.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-2xl">
                        <BoxOpen
                          size={34}
                          className="text-gray-300 mx-auto mb-2"
                        />
                        <div className="text-gray-400 text-sm font-medium">
                          Belum ada menu aktif
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto pr-1">
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-white z-10">
                              <tr className="text-gray-400 font-medium border-b border-gray-100">
                                <th className="py-3 pr-3">Menu</th>
                                <th className="py-3 px-3 text-right">
                                  Stok Awal
                                </th>
                                <th className="py-3 px-3 text-right">Masuk</th>
                                <th className="py-3 px-3 text-right">Keluar</th>
                                <th className="py-3 pl-3 text-right">
                                  Stok Akhir
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.inventorySummary.map((item) => (
                                <tr
                                  key={item.id}
                                  className="border-b border-gray-50 last:border-0"
                                >
                                  <td className="py-3 pr-3 text-gray-900 font-medium max-w-[160px] truncate">
                                    {item.nama}
                                  </td>
                                  <td className="py-3 px-3 text-right text-gray-600 font-medium">
                                    {item.stokAwal}
                                  </td>
                                  <td className="py-3 px-3 text-right text-[var(--accent-600)] font-medium">
                                    +{item.stockIn}
                                  </td>
                                  <td className="py-3 px-3 text-right text-red-500 font-medium">
                                    -{item.stockOut}
                                  </td>
                                  <td className="py-3 pl-3 text-right text-gray-900 font-medium">
                                    {item.stokAkhir}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="sm:hidden space-y-3">
                          {reportData.inventorySummary.map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-50 rounded-2xl p-3 border border-gray-100"
                            >
                              <div className="text-gray-900 text-sm font-medium truncate mb-3">
                                {item.nama}
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                  <div className="text-gray-900 text-sm font-medium">
                                    {item.stokAwal}
                                  </div>
                                  <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                    Awal
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[var(--accent-600)] text-sm font-medium">
                                    +{item.stockIn}
                                  </div>
                                  <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                    Masuk
                                  </div>
                                </div>
                                <div>
                                  <div className="text-red-500 text-sm font-medium">
                                    -{item.stockOut}
                                  </div>
                                  <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                    Keluar
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-900 text-sm font-medium">
                                    {item.stokAkhir}
                                  </div>
                                  <div className="text-gray-400 text-[10px] font-medium mt-0.5">
                                    Akhir
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeReportTab === "stock-movement" && (
                <>
                  <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm">
                          <Box size={15} className="text-amber-600" /> Rekod
                          Pergerakan Stok
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Tambah/tolak stok manual ikut filter tarikh
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs font-medium">
                        {reportData.stockMovements.length} rekod
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[var(--accent-50)] border border-[var(--accent-100)] rounded-2xl p-3">
                        <div className="text-[var(--accent-700)] text-xs font-medium">
                          Stok Masuk
                        </div>
                        <div className="text-[var(--accent-700)] text-xl font-medium mt-1">
                          +{reportData.stockInTotal} unit
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                        <div className="text-red-600 text-xs font-medium">
                          Stok Keluar
                        </div>
                        <div className="text-red-600 text-xl font-medium mt-1">
                          -{reportData.stockOutTotal} unit
                        </div>
                      </div>
                    </div>
                    {reportData.stockMovements.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-2xl">
                        <BoxOpen
                          size={34}
                          className="text-gray-300 mx-auto mb-2"
                        />
                        <div className="text-gray-400 text-sm font-medium">
                          Belum ada pergerakan stok dalam tempoh ini
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                        {reportData.stockMovements.map((item) => {
                          const isIn = isStockInMovement(item.type);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-gray-900 text-sm font-medium truncate">
                                  {item.produk_nama}
                                </div>
                                <div className="text-gray-400 text-xs mt-1">
                                  {formatReceiptDate(item.created_at)}
                                </div>
                                <div className="text-gray-500 text-xs mt-1 truncate">
                                  {item.reason || "Tiada sebab"}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div
                                  className={`text-sm font-medium ${isIn ? "text-[var(--accent-600)]" : "text-red-500"}`}
                                >
                                  {isIn ? "+" : "-"}
                                  {item.qty} unit
                                </div>
                                <div
                                  className={`text-[10px] font-medium px-2 py-1 rounded-full mt-1 ${isIn ? "bg-[var(--accent-100)] text-[var(--accent-700)]" : "bg-red-100 text-red-600"}`}
                                >
                                  {formatMovementType(item.type)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeReportTab === "receipts" && (
                <>
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-gray-900 font-medium text-base flex items-center gap-2">
                          <Receipt
                            size={17}
                            className="text-[var(--accent-600)]"
                          />
                          Rekod Resit
                        </h3>
                        <p className="text-gray-400 text-xs font-medium mt-1">
                          Senarai resit jualan ikut filter semasa
                        </p>
                      </div>
                      <span className="bg-gray-50 border border-gray-100 text-gray-500 text-xs font-medium px-3 py-2 rounded-full">
                        {reportData.recentReceipts.length} resit
                      </span>
                    </div>

                    {reportData.recentReceipts.length === 0 ? (
                      <div className="text-center py-10">
                        <Receipt
                          size={34}
                          className="text-gray-300 mx-auto mb-3"
                        />
                        <div className="text-gray-900 text-sm font-medium">
                          Tiada rekod resit
                        </div>
                        <div className="text-gray-400 text-xs font-medium mt-1">
                          Belum ada resit untuk tempoh filter ini.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full table-fixed text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="w-[17%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Resit No
                                </th>
                                <th className="w-[13%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  No Meja
                                </th>
                                <th className="w-[15%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Tarikh
                                </th>
                                <th className="w-[11%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Masa
                                </th>
                                <th className="w-[17%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Cara Pembayaran
                                </th>
                                <th className="w-[12%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Jumlah
                                </th>
                                <th className="w-[15%] px-4 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {reportData.recentReceipts.map((receipt) => (
                                <tr
                                  key={`receipt-table-${receipt.id}`}
                                  className="hover:bg-gray-50/70 transition-all"
                                >
                                  <td className="px-4 py-4">
                                    <span className="font-mono text-xs font-medium text-gray-900">
                                      #{receipt.id.slice(0, 8).toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-gray-700 font-medium">
                                    {displayMejaLabel(receipt.meja)}
                                  </td>
                                  <td className="px-4 py-4 text-gray-600 font-medium">
                                    {formatReceiptDateOnly(receipt.created_at)}
                                  </td>
                                  <td className="px-4 py-4 text-gray-600 font-medium">
                                    {formatReceiptTimeOnly(receipt.created_at)}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="inline-flex items-center gap-1.5 bg-[var(--accent-50)] border border-[var(--accent-100)] text-[var(--accent-700)] text-xs font-medium px-3 py-1.5 rounded-full">
                                      <CreditCard size={13} strokeWidth={2} />
                                      {receipt.payment_method || "Belum direkod"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-right text-gray-900 font-medium">
                                    {formatRM(receipt.total)}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedReceipt(receipt)}
                                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 active:scale-95 transition-all"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => downloadReceipt(receipt)}
                                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[var(--accent-600)] text-white text-xs font-medium hover:bg-[var(--accent-700)] active:scale-95 transition-all"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="lg:hidden p-4 space-y-3">
                          {reportData.recentReceipts.map((receipt) => (
                            <div
                              key={`receipt-card-${receipt.id}`}
                              className="bg-gray-50 rounded-3xl p-4 border border-gray-100"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-medium text-gray-900 truncate">
                                    #{receipt.id.slice(0, 8).toUpperCase()}
                                  </div>
                                  <div className="text-gray-400 text-xs font-medium mt-1">
                                    {displayMejaLabel(receipt.meja)} · {formatReceiptDateOnly(receipt.created_at)} · {formatReceiptTimeOnly(receipt.created_at)}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-gray-900 text-sm font-medium">
                                    {formatRM(receipt.total)}
                                  </div>
                                  <div className="text-[var(--accent-700)] bg-[var(--accent-50)] border border-[var(--accent-100)] rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 inline-block">
                                    {receipt.payment_method || "Belum direkod"}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => setSelectedReceipt(receipt)}
                                  className="bg-gray-900 text-white text-xs font-medium py-2.5 rounded-2xl active:scale-95 transition-all"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => downloadReceipt(receipt)}
                                  className="bg-[var(--accent-600)] text-white text-xs font-medium py-2.5 rounded-2xl active:scale-95 transition-all"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STAFF */}
          {activeTab === "staff" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-gray-900 font-medium text-lg">
                  Staff ({staff.length})
                </h2>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-[var(--accent-600)] text-white text-xs font-medium px-4 py-2 rounded-full"
                >
                  + Tambah Staff
                </button>
              </div>
              {resetMsg && (
                <div className="bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-medium p-3 rounded-2xl mb-3 border border-[var(--accent-200)]">
                  {resetMsg}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-100)] flex items-center justify-center flex-shrink-0">
                      {s.role === "kitchen" ? (
                        <ChefHat
                          size={18}
                          className="text-[var(--accent-600)]"
                        />
                      ) : s.role === "manager" ? (
                        <UserCog
                          size={18}
                          className="text-[var(--accent-600)]"
                        />
                      ) : (
                        <UserRound
                          size={18}
                          className="text-[var(--accent-600)]"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium text-sm">
                        {s.nama}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.role === "kitchen" ? "bg-orange-100 text-orange-600" : s.role === "manager" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}
                        >
                          {s.role === "kitchen"
                            ? "Dapur"
                            : s.role === "manager"
                              ? "Manager"
                              : "Cashier"}
                        </span>
                        <span className="text-gray-300 text-xs">
                          @{s.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleStaff(s.id, s.is_active)}
                        className={`text-xs font-medium px-2 py-1.5 rounded-xl border ${s.is_active ? "bg-red-50 text-red-500 border-red-200" : "bg-[var(--accent-50)] text-[var(--accent-600)] border-[var(--accent-200)]"}`}
                      >
                        {s.is_active ? "Nyahaktif" : "Aktifkan"}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setResetStaffId(s.id);
                            setResetStaffNama(s.nama);
                            setNewStaffPassword("");
                          }}
                          className="flex-1 flex items-center justify-center py-1.5 rounded-xl border bg-amber-50 text-amber-500 border-amber-200"
                          title="Reset Password"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M7 11V7a5 5 0 0 1 10 0v4"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeStaff(s.id)}
                          className="flex-1 flex items-center justify-center py-1.5 rounded-xl border bg-red-50 text-red-500 border-red-200"
                          title="Buang Staff"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M3 6H5H21"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6L18.1245 19.1354C18.0544 20.1875 17.1763 21 16.1218 21H7.87824C6.82373 21 5.94563 20.1875 5.87551 19.1354L5 6"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {staff.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <Users size={34} className="text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-400 text-sm">Belum ada staff</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div>
              <div className="mb-4">
                <h2 className="text-gray-900 font-medium text-xl flex items-center gap-2">
                  <ActiveSettingsIcon
                    size={20}
                    strokeWidth={2}
                    className="text-[var(--accent-600)]"
                  />
                  <span>{activeSettings?.label || "Tetapan"}</span>
                </h2>
                <p className="text-gray-400 text-xs font-medium mt-1">
                  {activeSettings?.description || "Tetapan kedai"}
                </p>
              </div>

              {activeSettingsTab === "table-setup" && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-gray-900 font-medium text-sm">
                        <Armchair
                          size={15}
                          className="text-[var(--accent-600)]"
                        />{" "}
                        Setup Meja Kedai
                      </h3>
                      <p className="text-gray-400 text-xs mt-1">
                        Default 6 meja. Bungkus akan kekal automatik.
                      </p>
                    </div>
                    <span className="bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--accent-100)]">
                      Max 20
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <button
                        onClick={() => changeTableCount(tableCountInput - 1)}
                        disabled={tableCountInput <= 1}
                        className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-700 font-medium text-xl disabled:opacity-40 active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <div className="text-center">
                        <div className="text-gray-900 text-4xl font-medium leading-none">
                          {tableCountInput}
                        </div>
                        <div className="text-gray-400 text-xs font-medium mt-1 uppercase tracking-wide">
                          Meja
                        </div>
                      </div>
                      <button
                        onClick={() => changeTableCount(tableCountInput + 1)}
                        disabled={tableCountInput >= 20}
                        className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-700 font-medium text-xl disabled:opacity-40 active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={tableCountInput}
                      onChange={(e) => changeTableCount(Number(e.target.value))}
                      className="w-full accent-[var(--accent-600)]"
                    />
                    <div className="mt-4 grid grid-cols-7 gap-1.5">
                      {Array.from({ length: tableCountInput }).map(
                        (_, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-xl py-2 text-center text-gray-700 text-xs font-medium"
                          >
                            {index + 1}
                          </div>
                        ),
                      )}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl py-2 text-center text-amber-700 text-xs font-medium">
                        <ShoppingCart size={14} />
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs mt-3">
                      POS akan papar Meja 1 hingga Meja {tableCountInput}, dan
                      pilihan Bungkus.
                    </div>
                  </div>
                  {tableMsg && (
                    <div
                      className={`text-xs font-medium mb-3 p-3 rounded-xl ${isSuccessMessage(tableMsg) ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}
                    >
                      {tableMsg}
                    </div>
                  )}
                  <button
                    onClick={saveTableCount}
                    disabled={
                      saving ||
                      tableCountInput ===
                        Math.min(
                          Math.max(Number(kedaiInfo?.table_count || 6), 1),
                          20,
                        )
                    }
                    className="w-full bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Setup Meja"}
                  </button>
                </div>
              )}

              {activeSettingsTab === "store-setup" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm">
                          <Store
                            size={15}
                            className="text-[var(--accent-600)]"
                          />{" "}
                          Setup Kedai
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">
                          Upload logo kedai dan QR DuitNow untuk digunakan di
                          owner, staff dan kitchen.
                        </p>
                      </div>
                      <span className="bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--accent-100)]">
                        Branding
                      </span>
                    </div>

                    {storeSetupMsg && (
                      <div
                        className={`text-xs font-medium mb-4 p-3 rounded-xl ${isSuccessMessage(storeSetupMsg) ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}
                      >
                        {storeSetupMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-gray-900 text-sm font-medium">
                              Logo Kedai
                            </div>
                            <div className="text-gray-400 text-xs font-medium mt-0.5">
                              Untuk header app
                            </div>
                          </div>
                          <ImageIcon
                            size={20}
                            className="text-[var(--accent-600)]"
                          />
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl h-36 flex items-center justify-center overflow-hidden mb-3">
                          {kedaiInfo?.logo_url ? (
                            <img
                              src={kedaiInfo.logo_url}
                              alt="Logo kedai"
                              className="max-h-full max-w-full object-contain p-3"
                            />
                          ) : (
                            <div className="text-center px-4">
                              <Store
                                size={34}
                                className="text-gray-300 mx-auto mb-2"
                              />
                              <div className="text-gray-400 text-xs font-medium">
                                Belum ada logo
                              </div>
                            </div>
                          )}
                        </div>

                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              uploadKedaiAsset(
                                e.target.files?.[0] || null,
                                "logo",
                              )
                            }
                          />
                          <span className="w-full inline-flex items-center justify-center bg-gray-900 text-white font-medium py-3 rounded-2xl text-sm active:scale-95 transition-all cursor-pointer">
                            {uploadingLogo ? "Uploading..." : "Upload Logo"}
                          </span>
                        </label>
                      </div>

                      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-gray-900 text-sm font-medium">
                              QR DuitNow
                            </div>
                            <div className="text-gray-400 text-xs font-medium mt-0.5">
                              Untuk payment staff
                            </div>
                          </div>
                          <CreditCard size={20} className="text-blue-500" />
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl h-36 flex items-center justify-center overflow-hidden mb-3">
                          {kedaiInfo?.duitnow_qr_url ? (
                            <img
                              src={kedaiInfo.duitnow_qr_url}
                              alt="QR DuitNow"
                              className="max-h-full max-w-full object-contain p-3"
                            />
                          ) : (
                            <div className="text-center px-4">
                              <Smartphone
                                size={34}
                                className="text-gray-300 mx-auto mb-2"
                              />
                              <div className="text-gray-400 text-xs font-medium">
                                Belum ada QR
                              </div>
                            </div>
                          )}
                        </div>

                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              uploadKedaiAsset(
                                e.target.files?.[0] || null,
                                "duitnow_qr",
                              )
                            }
                          />
                          <span className="w-full inline-flex items-center justify-center bg-[var(--accent-600)] text-white font-medium py-3 rounded-2xl text-sm active:scale-95 transition-all cursor-pointer">
                            {uploadingQr ? "Uploading..." : "Upload QR DuitNow"}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                      <div className="text-amber-700 text-xs font-medium">
                        Nota: QR DuitNow akan digunakan di staff payment popup.
                        Logo kedai akan digunakan untuk branding owner, staff
                        dan kitchen selepas Phase B/C.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === "charge-setup" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm">
                          <Receipt
                            size={15}
                            className="text-[var(--accent-600)]"
                          />{" "}
                          Setup Caj
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">
                          Tetapkan SST dan service charge untuk receipt dan
                          checkout staff.
                        </p>
                      </div>
                      <span className="bg-[var(--accent-50)] text-[var(--accent-700)] text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--accent-100)]">
                        Tax & Charge
                      </span>
                    </div>

                    {chargeMsg && (
                      <div
                        className={`text-xs font-medium mb-4 p-3 rounded-xl ${isSuccessMessage(chargeMsg) ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}
                      >
                        {chargeMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div
                        className={`rounded-3xl border p-4 ${sstEnabled ? "bg-[var(--accent-50)] border-[var(--accent-200)]" : "bg-gray-50 border-gray-100"}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="text-gray-900 text-sm font-medium">
                              SST
                            </div>
                            <div className="text-gray-400 text-xs font-medium mt-0.5">
                              Cukai SST yang dikenakan pada order
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSstEnabled(!sstEnabled)}
                            className={`w-14 h-8 rounded-full p-1 transition-all ${sstEnabled ? "bg-[var(--accent-600)]" : "bg-gray-300"}`}
                          >
                            <span
                              className={`block w-6 h-6 rounded-full bg-white shadow transition-all ${sstEnabled ? "translate-x-6" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                        <label className="text-gray-500 text-xs font-medium mb-2 block">
                          RATE SST (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={sstRate}
                            onChange={(e) => setSstRate(e.target.value)}
                            disabled={!sstEnabled}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-gray-900 text-sm font-medium outline-none focus:border-[var(--accent-500)] disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                            %
                          </span>
                        </div>
                      </div>

                      <div
                        className={`rounded-3xl border p-4 ${serviceChargeEnabled ? "bg-[var(--accent-50)] border-[var(--accent-200)]" : "bg-gray-50 border-gray-100"}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="text-gray-900 text-sm font-medium">
                              Service Charge
                            </div>
                            <div className="text-gray-400 text-xs font-medium mt-0.5">
                              Caj servis kedai untuk order pelanggan
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setServiceChargeEnabled(!serviceChargeEnabled)
                            }
                            className={`w-14 h-8 rounded-full p-1 transition-all ${serviceChargeEnabled ? "bg-[var(--accent-600)]" : "bg-gray-300"}`}
                          >
                            <span
                              className={`block w-6 h-6 rounded-full bg-white shadow transition-all ${serviceChargeEnabled ? "translate-x-6" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                        <label className="text-gray-500 text-xs font-medium mb-2 block">
                          RATE SERVICE CHARGE (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={serviceChargeRate}
                            onChange={(e) =>
                              setServiceChargeRate(e.target.value)
                            }
                            disabled={!serviceChargeEnabled}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-gray-900 text-sm font-medium outline-none focus:border-[var(--accent-500)] disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
                      <div className="text-gray-500 text-xs font-medium mb-3">
                        PREVIEW KIRAAN
                      </div>
                      {(() => {
                        const previewSubtotal = 100;
                        const previewService = serviceChargeEnabled
                          ? previewSubtotal *
                            ((Number(serviceChargeRate) || 0) / 100)
                          : 0;
                        const previewSst = sstEnabled
                          ? (previewSubtotal + previewService) *
                            ((Number(sstRate) || 0) / 100)
                          : 0;
                        const previewTotal =
                          previewSubtotal + previewService + previewSst;

                        return (
                          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
                            <div className="flex justify-between text-sm font-medium text-gray-500">
                              <span>Subtotal</span>
                              <span>RM {previewSubtotal.toFixed(2)}</span>
                            </div>
                            {serviceChargeEnabled && (
                              <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span>
                                  Service Charge (
                                  {Number(serviceChargeRate) || 0}%)
                                </span>
                                <span>RM {previewService.toFixed(2)}</span>
                              </div>
                            )}
                            {sstEnabled && (
                              <div className="flex justify-between text-sm font-medium text-gray-500">
                                <span>SST ({Number(sstRate) || 0}%)</span>
                                <span>RM {previewSst.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between items-center">
                              <span className="text-gray-900 font-medium">
                                Total
                              </span>
                              <span className="text-gray-900 font-medium text-xl">
                                RM {previewTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="text-gray-400 text-xs font-medium mt-3">
                        Formula: Service charge dikira dari subtotal. SST dikira
                        selepas service charge.
                      </div>
                    </div>

                    <button
                      onClick={saveChargeSetting}
                      disabled={saving}
                      className="w-full bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl text-sm disabled:opacity-50"
                    >
                      {saving ? "Menyimpan..." : "Simpan Setup Caj"}
                    </button>
                  </div>
                </div>
              )}

              {activeSettingsTab === "theme" && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-gray-900 font-medium text-sm">
                        <Palette
                          size={15}
                          className="text-[var(--accent-600)]"
                        />{" "}
                        Theme Kedai
                      </h3>
                      <p className="text-gray-400 text-xs mt-1">
                        Simpan pilihan warna dan mode untuk branding kedai.
                      </p>
                    </div>
                    <span
                      className={`${selectedAccent.sample} text-white text-xs font-medium px-3 py-1.5 rounded-full`}
                    >
                      {selectedAccent.label}
                    </span>
                  </div>

                  {themeMsg && (
                    <div
                      className={`text-xs font-medium mb-4 p-3 rounded-xl ${isSuccessMessage(themeMsg) ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}
                    >
                      {themeMsg}
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="text-gray-500 text-xs font-medium mb-3 block">
                      ACCENT COLOR
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {accentColorOptions.map((color) => {
                        const isSelected = selectedAccentColor === color.id;
                        return (
                          <button
                            key={color.id}
                            onClick={() => setSelectedAccentColor(color.id)}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all ${isSelected ? `${color.ring} bg-gray-50 shadow-sm` : "border-gray-100 bg-white hover:bg-gray-50"}`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full ${color.dot}`}
                            />
                            <span className="text-gray-800 text-xs font-medium flex-1">
                              {color.label}
                            </span>
                            {isSelected && (
                              <CircleCheck
                                size={14}
                                className="text-[var(--accent-600)]"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-gray-500 text-xs font-medium mb-3 block">
                      APPEARANCE
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: "light",
                          label: "Light",
                          icon: Sun,
                          desc: "Paparan cerah",
                        },
                        {
                          id: "dark",
                          label: "Dark",
                          icon: Moon,
                          desc: "Simpan untuk dark mode",
                        },
                      ].map((mode) => {
                        const isSelected = selectedThemeMode === mode.id;
                        const ModeIcon = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setSelectedThemeMode(mode.id)}
                            className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? "border-[var(--accent-500)] bg-[var(--accent-50)]" : "border-gray-100 bg-gray-50"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <ModeIcon
                                size={22}
                                className="text-[var(--accent-600)]"
                              />
                              {isSelected && (
                                <CircleCheck
                                  size={15}
                                  className="text-[var(--accent-600)]"
                                />
                              )}
                            </div>
                            <div className="text-gray-900 text-sm font-medium">
                              {mode.label}
                            </div>
                            <div className="text-gray-400 text-xs font-medium mt-0.5">
                              {mode.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
                    <div className="text-gray-500 text-xs font-medium mb-3">
                      PREVIEW
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${selectedAccent.sample} flex items-center justify-center text-white font-medium`}
                        >
                          {kedaiInfo?.logo_url ? (
                            <img
                              src={kedaiInfo.logo_url}
                              alt="Logo preview"
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            "U"
                          )}
                        </div>
                        <div>
                          <div className="text-gray-900 text-sm font-medium">
                            {kedaiInfo?.nama || "Kedai Saya"}
                          </div>
                          <div className="text-gray-400 text-xs font-medium">
                            {selectedAccent.label} · {selectedThemeMode}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`${selectedAccent.sample} text-white rounded-2xl px-4 py-3 text-sm font-medium text-center`}
                      >
                        Contoh Button
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveThemeSetting}
                    disabled={saving}
                    className="w-full bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Theme"}
                  </button>
                </div>
              )}

              {activeSettingsTab === "password" && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-gray-900 font-medium text-sm mb-4">
                    <LockKeyhole
                      size={15}
                      className="text-[var(--accent-600)]"
                    />{" "}
                    Tukar Password Saya
                  </h3>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      PASSWORD SEMASA
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      PASSWORD BARU
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      CONFIRM PASSWORD BARU
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                    />
                  </div>
                  {passwordMsg && (
                    <div
                      className={`text-xs font-medium mb-3 p-3 rounded-xl ${isSuccessMessage(passwordMsg) ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}
                    >
                      {passwordMsg}
                    </div>
                  )}
                  <button
                    onClick={tukarPassword}
                    disabled={
                      !currentPassword || !newPassword || !confirmPassword
                    }
                    className="w-full bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl text-sm disabled:opacity-50"
                  >
                    Tukar Password
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom Date Modal */}
          {showFilterModal && (
            <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-gray-900 font-medium text-lg">
                      Tarikh Custom
                    </h3>
                    <p className="text-gray-400 text-xs font-medium mt-0.5">
                      Pilih julat tarikh laporan
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center justify-center active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-gray-500 text-xs font-medium mb-2 block">
                        START DATE
                      </label>
                      <input
                        type="date"
                        value={pendingCustomFrom}
                        onChange={(e) => setPendingCustomFrom(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium outline-none focus:border-[var(--accent-500)]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs font-medium mb-2 block">
                        END DATE
                      </label>
                      <input
                        type="date"
                        value={pendingCustomTo}
                        onChange={(e) => setPendingCustomTo(e.target.value)}
                        className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium outline-none focus:border-[var(--accent-500)]"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3.5 rounded-2xl active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyFilterModal}
                    disabled={!pendingCustomFrom || !pendingCustomTo}
                    className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3.5 rounded-2xl disabled:opacity-50 active:scale-95 transition-all"
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
                  <div>
                    <h3 className="text-gray-900 font-medium text-lg">
                      Receipt Preview
                    </h3>
                    <div className="text-gray-400 text-xs font-medium">
                      #{selectedReceipt.id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 font-medium"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="border border-gray-200 rounded-2xl p-5 bg-white">
                  <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                    <div className="text-gray-900 font-medium text-xl">
                      {kedaiInfo?.nama || "Kedai Saya"}
                    </div>
                    <div className="text-gray-400 text-xs font-medium mt-1">
                      Powered by UrusPOS
                    </div>
                    <div className="text-gray-400 text-xs mt-2">
                      {formatReceiptDate(selectedReceipt.created_at)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 font-medium mb-1">
                      <span>Order</span>
                      <span>
                        #{selectedReceipt.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium mb-1">
                      <span>Jenis</span>
                      <span>{displayMejaLabel(selectedReceipt.meja)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Bayaran</span>
                      <span>
                        {selectedReceipt.payment_method || "Belum direkod"}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-4 space-y-3">
                    {selectedReceipt.order_items.map((item, index) => (
                      <div
                        key={`${item.nama}-${index}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <div className="flex-1">
                          <div className="text-gray-900 font-medium">
                            {item.nama}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {item.qty} x {formatRM(item.harga)}
                          </div>
                          {item.nota && (
                            <div className="text-amber-600 text-xs mt-1">
                              Nota: {item.nota}
                            </div>
                          )}
                        </div>
                        <div className="text-gray-900 font-medium">
                          {formatRM(item.qty * item.harga)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
                    {shouldShowReceiptCaj(selectedReceipt) && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                          <span>Subtotal</span>
                          <span>
                            {formatRM(getReceiptSubtotal(selectedReceipt))}
                          </span>
                        </div>
                        {getReceiptServiceCharge(selectedReceipt) > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>
                              Service Charge (
                              {formatReceiptRate(
                                selectedReceipt.service_charge_rate,
                              )}
                              %)
                            </span>
                            <span>
                              {formatRM(
                                getReceiptServiceCharge(selectedReceipt),
                              )}
                            </span>
                          </div>
                        )}
                        {getReceiptSst(selectedReceipt) > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>
                              SST ({formatReceiptRate(selectedReceipt.sst_rate)}
                              %)
                            </span>
                            <span>
                              {formatRM(getReceiptSst(selectedReceipt))}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-dashed border-gray-300 pt-2" />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-medium">TOTAL</span>
                      <span className="text-gray-900 font-medium text-xl">
                        {formatRM(selectedReceipt.total)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center text-gray-400 text-xs mt-5">
                    Terima kasih.
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full mt-4 bg-[var(--accent-600)] text-white font-medium py-3 rounded-2xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                onClick={() => setShowMobileMenu(false)}
                className="absolute inset-0 bg-black/40"
                aria-label="Tutup menu"
              />
              <div className="relative h-full w-[min(16.5rem,85vw)] bg-white shadow-2xl flex flex-col overflow-hidden animate-[slideInLeft_0.2s_ease-out]">
                <OwnerSidebarMenu expanded mobile />
              </div>
              <style jsx>{`
                @keyframes slideInLeft {
                  from {
                    transform: translateX(calc(-100% - 12px));
                  }
                  to {
                    transform: translateX(0);
                  }
                }
              `}</style>
            </div>
          )}

          {/* Add Staff Modal */}
          {showAddStaff && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-gray-900 font-medium text-lg mb-6">
                  <Plus
                    size={18}
                    className="text-[var(--accent-600)] inline mr-2"
                  />{" "}
                  Tambah Staff Baru
                </h3>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    NAMA PENUH
                  </label>
                  <input
                    type="text"
                    value={newStaffNama}
                    onChange={(e) => setNewStaffNama(e.target.value)}
                    placeholder="cth: Ahmad bin Ali"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    USERNAME
                  </label>
                  <input
                    type="text"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="cth: ahmad123"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    ROLE
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "staff", label: "Cashier" },
                      { id: "kitchen", label: "Dapur" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setNewStaffRole(r.id)}
                        className={`py-3 rounded-xl border text-xs font-medium transition-all ${newStaffRole === r.id ? "bg-[var(--accent-50)] border-[var(--accent-500)] text-[var(--accent-700)]" : "bg-white border-gray-200 text-gray-400"}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {staffError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <div className="text-red-600 text-xs font-medium">
                      <AlertTriangle size={14} className="inline mr-1" />{" "}
                      {staffError}
                    </div>
                  </div>
                )}
                <div className="bg-[var(--accent-50)] border border-[var(--accent-200)] rounded-xl p-3 mb-4">
                  <div className="text-[var(--accent-700)] text-xs font-medium mb-1">
                    <KeyRound size={16} className="inline mr-2" /> Credential
                    Staff
                  </div>
                  <div className="text-[var(--accent-600)] text-xs">
                    Username: <strong>{newStaffUsername || "..."}</strong>
                  </div>
                  <div className="text-[var(--accent-600)] text-xs">
                    Password: <strong>abc123</strong> (default)
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddStaff(false)}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={addStaff}
                    disabled={
                      saving || !newStaffNama.trim() || !newStaffUsername.trim()
                    }
                    className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manage Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-gray-900 font-medium text-lg flex items-center gap-2">
                      <FolderTree
                        size={19}
                        className="text-[var(--accent-600)]"
                      />
                      Manage Kategori
                    </h3>
                    <p className="text-gray-400 text-xs font-medium mt-1">
                      Tambah, edit, aktif/nyahaktif dan buang kategori menu.
                    </p>
                  </div>
                  <button
                    onClick={closeManageCategories}
                    className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center active:scale-95 transition-all"
                    aria-label="Tutup kategori"
                  >
                    <X size={18} />
                  </button>
                </div>

                {categoryError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
                    <div className="text-red-600 text-xs font-medium flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{categoryError}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4">
                  <div className="bg-gray-50 rounded-3xl border border-gray-100 p-4">
                    <div className="text-gray-900 text-sm font-medium mb-1">
                      {editCategoryId ? "Edit Kategori" : "Tambah Kategori"}
                    </div>
                    <div className="text-gray-400 text-xs font-medium mb-4">
                      {editCategoryId
                        ? "Kemaskini nama dan icon kategori."
                        : "Kategori baru akan muncul dalam dropdown menu."}
                    </div>

                    <div className="mb-4">
                      <label className="text-gray-500 text-xs font-medium mb-2 block">
                        NAMA KATEGORI
                      </label>
                      <input
                        type="text"
                        value={editCategoryId ? editCategoryNama : categoryNama}
                        onChange={(e) => {
                          if (editCategoryId)
                            setEditCategoryNama(e.target.value);
                          else setCategoryNama(e.target.value);
                          setCategoryError("");
                        }}
                        placeholder="cth: Dessert"
                        className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-medium outline-none focus:border-[var(--accent-500)]"
                      />
                    </div>

                    <div className="mb-5">
                      <label className="text-gray-500 text-xs font-medium mb-2 block">
                        ICON
                      </label>
                      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                        {CATEGORY_ICON_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const currentIcon = editCategoryId
                            ? editCategoryIcon
                            : categoryIcon;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              title={option.label}
                              onClick={() => {
                                if (editCategoryId)
                                  setEditCategoryIcon(option.id);
                                else setCategoryIcon(option.id);
                              }}
                              className={`h-11 rounded-2xl border flex items-center justify-center transition-all ${
                                currentIcon === option.id
                                  ? "bg-[var(--accent-50)] border-[var(--accent-500)] text-[var(--accent-700)]"
                                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Icon size={18} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {editCategoryId && (
                        <button
                          onClick={cancelEditCategory}
                          className="flex-1 bg-white border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl text-sm active:scale-95 transition-all"
                        >
                          Batal Edit
                        </button>
                      )}

                      <button
                        onClick={editCategoryId ? updateCategory : addCategory}
                        disabled={
                          saving ||
                          (editCategoryId
                            ? !editCategoryNama.trim()
                            : !categoryNama.trim())
                        }
                        className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {saving
                          ? "Menyimpan..."
                          : editCategoryId
                            ? "Update"
                            : "Tambah"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-gray-900 text-sm font-medium">
                          Senarai Kategori
                        </div>
                        <div className="text-gray-400 text-xs font-medium">
                          {categories.length} kategori tersedia
                        </div>
                      </div>
                      <span className="bg-gray-50 text-gray-500 text-[10px] font-medium px-3 py-1.5 rounded-full border border-gray-100">
                        Active / Inactive
                      </span>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                      {categories.length === 0 ? (
                        <div className="p-6 text-center">
                          <FolderTree
                            size={32}
                            className="text-gray-300 mx-auto mb-2"
                          />
                          <div className="text-gray-400 text-sm font-medium">
                            Belum ada kategori.
                          </div>
                        </div>
                      ) : (
                        categories.map((category) => {
                          const CategoryListIcon =
                            CATEGORY_ICON_MAP[category.icon || ""] || Box;
                          const productCount = produk.filter(
                            (product) => product.kategori_id === category.id,
                          ).length;
                          const isEditing = editCategoryId === category.id;

                          return (
                            <div
                              key={`category-manage-${category.id}`}
                              className={`p-4 flex items-center justify-between gap-3 transition-all ${
                                isEditing
                                  ? "bg-[var(--accent-50)]"
                                  : "hover:bg-gray-50/70"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                                    category.is_active
                                      ? "bg-white border-gray-100 text-[var(--accent-600)]"
                                      : "bg-gray-100 border-gray-200 text-gray-300"
                                  }`}
                                >
                                  <CategoryListIcon size={18} />
                                </div>

                                <div className="min-w-0">
                                  <div className="text-gray-900 text-sm font-medium truncate">
                                    {category.nama}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                        category.is_active
                                          ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]"
                                          : "bg-gray-50 text-gray-400 border-gray-100"
                                      }`}
                                    >
                                      {category.is_active
                                        ? "Aktif"
                                        : "Tidak aktif"}
                                    </span>
                                    <span className="text-gray-400 text-[10px] font-medium">
                                      {productCount} menu
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => startEditCategory(category)}
                                  className="w-9 h-9 rounded-xl border bg-blue-50 text-blue-600 border-blue-100 flex items-center justify-center active:scale-95 transition-all"
                                  title="Edit kategori"
                                  aria-label="Edit kategori"
                                >
                                  <Pencil size={14} />
                                </button>

                                <button
                                  onClick={() =>
                                    toggleCategory(
                                      category.id,
                                      category.is_active,
                                    )
                                  }
                                  disabled={saving}
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 ${
                                    category.is_active
                                      ? "bg-amber-50 text-amber-600 border-amber-100"
                                      : "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-100)]"
                                  }`}
                                  title={
                                    category.is_active
                                      ? "Nyahaktif kategori"
                                      : "Aktifkan kategori"
                                  }
                                  aria-label={
                                    category.is_active
                                      ? "Nyahaktif kategori"
                                      : "Aktifkan kategori"
                                  }
                                >
                                  {category.is_active ? (
                                    <Pause size={14} />
                                  ) : (
                                    <Play size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={() => removeCategory(category)}
                                  disabled={saving || productCount > 0}
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 ${
                                    productCount > 0
                                      ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                      : "bg-red-50 text-red-500 border-red-100"
                                  }`}
                                  title={
                                    productCount > 0
                                      ? "Kategori masih digunakan menu"
                                      : "Buang kategori"
                                  }
                                  aria-label={
                                    productCount > 0
                                      ? "Kategori masih digunakan menu"
                                      : "Buang kategori"
                                  }
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <div className="text-amber-700 text-xs font-medium flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Kategori yang masih digunakan oleh menu tidak boleh
                      dibuang terus. Tukar kategori menu dahulu atau
                      nyahaktifkan kategori.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Produk Modal */}
          {showAddProduk && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-gray-900 font-medium text-lg mb-6">
                  <Plus
                    size={18}
                    className="text-[var(--accent-600)] inline mr-2"
                  />{" "}
                  Tambah Menu
                </h3>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    NAMA MENU
                  </label>
                  <input
                    type="text"
                    value={produkNama}
                    onChange={(e) => setProdukNama(e.target.value)}
                    placeholder="cth: Nasi Lemak"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    KATEGORI
                  </label>
                  <select
                    value={produkKategoriId}
                    onChange={(e) => setProdukKategoriId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                  >
                    <option value="">Lain-lain</option>
                    {activeCategories().map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-gray-500 text-xs font-medium mb-2 block">
                      HARGA JUAL (RM)
                    </label>
                    <input
                      type="number"
                      value={produkHarga}
                      onChange={(e) => setProdukHarga(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-medium mb-2 block">
                      KOS MENU (RM)
                    </label>
                    <input
                      type="number"
                      value={produkKos}
                      onChange={(e) => setProdukKos(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    STOK AWAL
                  </label>
                  <input
                    type="number"
                    value={produkStok}
                    onChange={(e) => setProdukStok(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                {produkHarga && produkKos && (
                  <div
                    className={`rounded-xl p-3 mb-4 ${marginTambah >= 40 ? "bg-[var(--accent-50)] border border-[var(--accent-200)]" : "bg-amber-50 border border-amber-200"}`}
                  >
                    <div
                      className={`text-xs font-medium ${marginTambah >= 40 ? "text-[var(--accent-700)]" : "text-amber-700"}`}
                    >
                      <Lightbulb size={14} className="inline mr-1" /> Margin:{" "}
                      <strong>{marginTambah}%</strong>{" "}
                      {marginTambah >= 40 ? "— Bagus" : "— Rendah sikit"}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddProduk(false)}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={addProduk}
                    disabled={saving || !produkNama.trim()}
                    className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Menu Modal */}
          {editProdukId && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
              <div
                className="bg-white rounded-2xl p-6 w-full max-w-sm"
                style={{ maxHeight: "90vh", overflowY: "auto" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-gray-900 font-medium text-lg">
                    <Pencil size={12} /> Edit Menu
                  </h3>
                  <button
                    onClick={closeEditProduk}
                    className="text-gray-400 text-xl"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                  <div className="text-gray-500 text-xs font-medium mb-3">
                    MAKLUMAT MENU
                  </div>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      NAMA MENU
                    </label>
                    <input
                      type="text"
                      value={editProdukNama}
                      onChange={(e) => setEditProdukNama(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      KATEGORI
                    </label>
                    <select
                      value={editProdukKategoriId}
                      onChange={(e) => setEditProdukKategoriId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                    >
                      <option value="">Lain-lain</option>
                      {activeCategories().map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-500 text-xs font-medium mb-1 block">
                        HARGA JUAL (RM)
                      </label>
                      <input
                        type="number"
                        value={editProdukHarga}
                        onChange={(e) => setEditProdukHarga(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs font-medium mb-1 block">
                        KOS MENU (RM)
                      </label>
                      <input
                        type="number"
                        value={editProdukKos}
                        onChange={(e) => setEditProdukKos(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                      />
                    </div>
                  </div>
                  {editProdukHarga && editProdukKos && (
                    <div
                      className={`rounded-xl p-2 mt-3 ${marginEdit >= 40 ? "bg-[var(--accent-100)]" : "bg-amber-100"}`}
                    >
                      <div
                        className={`text-xs font-medium ${marginEdit >= 40 ? "text-[var(--accent-700)]" : "text-amber-700"}`}
                      >
                        <Lightbulb size={14} className="inline mr-1" /> Margin:{" "}
                        <strong>{marginEdit}%</strong>{" "}
                        {marginEdit >= 40 ? "— Bagus" : "— Rendah sikit"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                  <div className="text-gray-500 text-xs font-medium mb-3">
                    KEMASKINI STOK
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-xs font-medium">
                      STOK SEMASA
                    </span>
                    <span
                      className={`text-lg font-medium ${editStokSemasa <= 5 ? "text-red-500" : "text-gray-900"}`}
                    >
                      {editStokSemasa} unit
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => {
                        setEditStokMode("tambah");
                        setEditStokQty("");
                        setEditStokError("");
                      }}
                      className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${editStokMode === "tambah" ? "bg-[var(--accent-50)] border-[var(--accent-500)] text-[var(--accent-700)]" : "bg-white border-gray-200 text-gray-400"}`}
                    >
                      <Plus size={13} className="inline mr-1" /> Tambah Stok
                    </button>
                    <button
                      onClick={() => {
                        setEditStokMode("tolak");
                        setEditStokQty("");
                        setEditStokError("");
                      }}
                      className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${editStokMode === "tolak" ? "bg-red-50 border-red-400 text-red-600" : "bg-white border-gray-200 text-gray-400"}`}
                    >
                      <Minus size={13} className="inline mr-1" /> Tolak Stok
                    </button>
                  </div>
                  <div className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">
                      JUMLAH UNIT{" "}
                      <span className="text-gray-400 font-normal">
                        (kosongkan kalau tak nak ubah stok)
                      </span>
                    </label>
                    <input
                      type="number"
                      value={editStokQty}
                      onChange={(e) => {
                        setEditStokQty(e.target.value);
                        setEditStokError("");
                      }}
                      placeholder="0"
                      min="1"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white text-center text-xl font-medium"
                    />
                  </div>
                  {editStokQty && (
                    <>
                      <div className="mb-3">
                        <label className="text-gray-500 text-xs font-medium mb-2 block">
                          SEBAB / REASON
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {(editStokMode === "tambah"
                            ? [
                                "Restock",
                                "Pembelian Baru",
                                "Pindahan",
                                "Lain-lain",
                              ]
                            : [
                                "Rosak / Luput",
                                "Hilang",
                                "Guna Sendiri",
                                "Lain-lain",
                              ]
                          ).map((r) => (
                            <button
                              key={r}
                              onClick={() => setEditStokReason(r)}
                              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left ${editStokReason === r ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-400"}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={editStokReason}
                          onChange={(e) => setEditStokReason(e.target.value)}
                          placeholder="Atau taip reason sendiri..."
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] bg-white"
                        />
                      </div>
                      {previewStokBaru !== null && (
                        <div
                          className={`rounded-xl p-2.5 ${previewStokBaru < 0 ? "bg-red-50 border border-red-200" : previewStokBaru <= 5 ? "bg-amber-50 border border-amber-200" : "bg-[var(--accent-50)] border border-[var(--accent-200)]"}`}
                        >
                          <div
                            className={`text-xs font-medium ${previewStokBaru < 0 ? "text-red-600" : previewStokBaru <= 5 ? "text-amber-700" : "text-[var(--accent-700)]"}`}
                          >
                            {previewStokBaru < 0
                              ? `Stok tidak cukup! Akan jadi ${previewStokBaru} unit.`
                              : previewStokBaru <= 5
                                ? `Stok selepas: ${previewStokBaru} unit (kritikal)`
                                : `Stok selepas: ${previewStokBaru} unit`}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {editStokError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                    <div className="text-red-600 text-xs font-medium">
                      <AlertTriangle size={14} className="inline mr-1" />{" "}
                      {editStokError}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeEditProduk}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitEditProduk}
                    disabled={saving || !editProdukNama.trim()}
                    className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl disabled:opacity-50"
                  >
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
                <Trash2 size={34} className="text-red-400 mx-auto mb-3" />
                <h3 className="text-gray-900 font-medium text-lg text-center mb-1">
                  Buang Menu?
                </h3>
                <p className="text-gray-400 text-sm text-center mb-1">
                  <strong className="text-gray-700">
                    {confirmDeleteProdukNama}
                  </strong>
                </p>
                <p className="text-gray-400 text-xs text-center mb-6">
                  Menu akan disembunyikan dari POS. Rekod jualan lama tidak
                  terjejas.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setConfirmDeleteProdukId(null);
                      setConfirmDeleteProdukNama("");
                    }}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      removeProduk(confirmDeleteProdukId);
                      setConfirmDeleteProdukId(null);
                      setConfirmDeleteProdukNama("");
                    }}
                    className="flex-1 bg-red-500 text-white font-medium py-3 rounded-xl"
                  >
                    Ya, Buang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Password Staff Modal */}
          {resetStaffId && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-gray-900 font-medium text-lg mb-2">
                  <KeyRound
                    size={18}
                    className="text-[var(--accent-600)] inline mr-2"
                  />{" "}
                  Reset Password
                </h3>
                <p className="text-gray-400 text-sm mb-6">{resetStaffNama}</p>
                <div className="mb-6">
                  <label className="text-gray-500 text-xs font-medium mb-2 block">
                    PASSWORD BARU
                  </label>
                  <input
                    type="text"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="cth: newpass123"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResetStaffId(null)}
                    className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={resetPasswordStaff}
                    disabled={!newStaffPassword.trim()}
                    className="flex-1 bg-[var(--accent-600)] text-white font-medium py-3 rounded-xl disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
