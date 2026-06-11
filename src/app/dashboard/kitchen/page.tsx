"use client";

import { useEffect, useState, useRef, CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChefHat,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Utensils,
  LogOut,
  X,
  Menu,
  KeyRound,
  ClipboardList,
  RotateCcw,
  Check,
  Timer,
  AlertCircle,
  Flame,
  Hourglass,
} from "lucide-react";

type OrderItem = {
  id: string;
  nama: string;
  qty: number;
  nota: string | null;
};

type Order = {
  id: string;
  meja: string | null;
  status: string;
  created_at: string;
  preparing_at: string | null;
  completed_at: string | null;
  order_number: string | null;
  created_by: string | null;
  order_items: OrderItem[];
};

type KitchenSession = {
  kedai_id?: string;
  nama?: string;
  username?: string;
};

function useNow(intervalMs = 10000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}j ${m}m` : `${h} jam`;
}

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [rekodOrders, setRekodOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [kitchenNama, setKitchenNama] = useState("Dapur");
  const [kedaiNama, setKedaiNama] = useState("");
  const [accentColor, setAccentColor] = useState("green");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"baru" | "menyiapkan" | "siap">("baru");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "rekod" | "password">("orders");
  const [rekodFilter, setRekodFilter] = useState<"hari_ini" | "minggu_ini" | "bulan_ini" | "custom">("hari_ini");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const now = useNow(10000);

  useEffect(() => {
    const session = getSession();
    if (session?.kedai_id) {
      setKedaiId(session.kedai_id);
      fetchKedaiNama(session.kedai_id);
      if (session.id) registerKitchenPush(session.id, session.kedai_id);
    }
    if (session?.nama) setKitchenNama(session.nama);

    fetchOrders();

    const channel = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { fetchOrders(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => { fetchOrders(); })
      .subscribe();

    function tick() {
      const d = new Date();
      setCurrentTime(`${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`);
    }
    tick();
    const clockInterval = setInterval(tick, 10000);

    return () => { supabase.removeChannel(channel); clearInterval(clockInterval); };
  }, []);

  function getSession(): KitchenSession | null {
    try {
      const cookies = document.cookie.split(";");
      const c = cookies.find((c) => c.trim().startsWith("uruspos_session="));
      const v = c?.split("=")?.[1];
      if (!v) return null;
      return JSON.parse(decodeURIComponent(v));
    } catch { return null; }
  }

  async function fetchKedaiNama(kId: string) {
    const { data } = (await supabase.from("kedai").select("nama, accent_color").eq("id", kId).single()) as any;
    if (data?.nama) setKedaiNama(data.nama);
    if (data?.accent_color) setAccentColor(data.accent_color);
  }

  async function registerKitchenPush(userId: string, kId: string) {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      const subscription = existingSub || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, user_id: userId, kedai_id: kId, role: "kitchen" }),
      });
    } catch (err) {
      console.error("Kitchen push registration error:", err);
    }
  }

  async function sendPushToStaff(order: Order, title: string, body: string) {
    if (!order.created_by || !kedaiId) return;
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: order.created_by,
          kedai_id: kedaiId,
          title,
          body,
          tag: `order-${order.id}`,
        }),
      });
    } catch (err) {
      console.error("Send push error:", err);
    }
  }

  async function fetchOrders() {
    const session = getSession();
    const kId = session?.kedai_id || null;

    // Today only — from midnight local time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["pending", "preparing", "paid", "done"])
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: true });
    if (kId) query = query.eq("kedai_id", kId);
    const { data, error } = (await query) as any;
    if (!error) setOrders(data || []);
    setLoading(false);
  }

  async function fetchRekodOrders() {
    const session = getSession();
    const kId = session?.kedai_id || null;

    const now2 = new Date();
    let from: Date;
    let to: Date | null = null;

    if (rekodFilter === "hari_ini") {
      from = new Date(now2); from.setHours(0, 0, 0, 0);
    } else if (rekodFilter === "minggu_ini") {
      from = new Date(now2); from.setDate(now2.getDate() - now2.getDay()); from.setHours(0, 0, 0, 0);
    } else if (rekodFilter === "custom" && customFrom) {
      from = new Date(customFrom); from.setHours(0, 0, 0, 0);
      if (customTo) { to = new Date(customTo); to.setHours(23, 59, 59, 999); }
    } else {
      from = new Date(now2.getFullYear(), now2.getMonth(), 1);
    }

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("status", "done")
      .gte("created_at", from.toISOString())
      .order("completed_at", { ascending: false });
    if (to) query = query.lte("created_at", to.toISOString());
    if (kId) query = query.eq("kedai_id", kId);
    const { data, error } = (await query) as any;
    if (!error) setRekodOrders(data || []);
  }

  useEffect(() => {
    if (activeTab === "rekod") fetchRekodOrders();
  }, [rekodFilter, activeTab, customFrom, customTo]);

  async function startPreparing(id: string) {
    await supabase
      .from("orders")
      .update({ status: "preparing", preparing_at: new Date().toISOString() } as any)
      .eq("id", id);
    const order = orders.find((o) => o.id === id);
    if (order) await sendPushToStaff(order, "🔥 Sedang Disiapkan", `${formatMeja(order.meja)} — Order sedang disiapkan oleh dapur.`);
    fetchOrders();
  }

  async function markDone(id: string) {
    await supabase
      .from("orders")
      .update({ status: "done", completed_at: new Date().toISOString() } as any)
      .eq("id", id);
    const order = orders.find((o) => o.id === id);
    if (order) await sendPushToStaff(order, "✅ Order Siap!", `${formatMeja(order.meja)} — Order siap! Boleh hantar ke meja.`);
    fetchOrders();
  }

  async function undoDone(id: string) {
    await supabase
      .from("orders")
      .update({ status: "preparing", completed_at: null } as any)
      .eq("id", id);
    fetchOrders();
  }

  async function tukarPasswordKitchen() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) { setPasswordMsg("Password baru tidak sepadan."); return; }
    if (newPassword.length < 6) { setPasswordMsg("Password kena sekurang-kurangnya 6 aksara."); return; }
    const session = getSession();
    const { data: currentUser } = (await supabase.from("users").select("password, id").eq("username", session?.username).single()) as any;
    if (currentUser?.password !== oldPassword) { setPasswordMsg("Password semasa tidak betul."); return; }
    await supabase.from("users").update({ password: newPassword } as any).eq("id", currentUser.id);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMsg("Password berjaya ditukar!");
    setTimeout(() => { setPasswordMsg(""); }, 2000);
  }

  function formatMeja(meja: string | null) {
    if (!meja) return "Bungkus";
    const n = meja.toString().trim();
    const u = n.toUpperCase();
    if (u === "BUNGKUS" || u === "TAKEAWAY" || u === "TAKE AWAY") return "Bungkus";
    if (u.startsWith("T") && !u.startsWith("TABLE")) {
      const num = u.replace("T", "");
      if (/^\d+$/.test(num)) return `Meja ${num}`;
    }
    if (/^\d+$/.test(n)) return `Meja ${n}`;
    if (n.toLowerCase().startsWith("meja")) return n;
    return n;
  }

  function isBungkus(meja: string | null) {
    const label = formatMeja(meja).toLowerCase();
    return label.includes("bungkus") || label.includes("takeaway");
  }

  function getOrderDisplayId(order: Order) {
    if (order.order_number) return order.order_number;
    return `#${order.id.slice(0, 8).toUpperCase()}`;
  }

  function getOrderItemCount(order: Order) {
    return order.order_items?.reduce((t, i) => t + Number(i.qty || 0), 0) || 0;
  }

  // Duration helpers using live `now`
  function getWaitDuration(order: Order) {
    // Time from order received to start preparing
    const start = new Date(order.created_at).getTime();
    const end = order.preparing_at ? new Date(order.preparing_at).getTime() : now;
    return formatDuration(end - start);
  }

  function getCookDuration(order: Order) {
    if (!order.preparing_at) return null;
    const start = new Date(order.preparing_at).getTime();
    const end = order.completed_at ? new Date(order.completed_at).getTime() : now;
    return formatDuration(end - start);
  }

  function getTotalDuration(order: Order) {
    const start = new Date(order.created_at).getTime();
    const end = order.completed_at ? new Date(order.completed_at).getTime() : now;
    return formatDuration(end - start);
  }

  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "paid");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const doneOrders = orders.filter((o) => o.status === "done");
  const allActiveOrders = [...pendingOrders, ...preparingOrders];
  const takeawayCount = allActiveOrders.filter((o) => isBungkus(o.meja)).length;
  const dineInCount = allActiveOrders.length - takeawayCount;

  const userInitial = String(kitchenNama || "D").slice(0, 1).toUpperCase();

  const navItems = [
    { id: "orders", label: "Pesanan Dapur", icon: ChefHat, description: "Order masuk & siapkan" },
    { id: "rekod", label: "Rekod Persiapan", icon: ClipboardList, description: "Sejarah pesanan siap" },
    { id: "password", label: "Tukar Password", icon: KeyRound, description: "Kemaskini password" },
  ];

  const KitchenSidebar = ({ expanded, mobile = false }: { expanded: boolean; mobile?: boolean }) => (
    <>
      <div className={`${expanded ? "px-5 justify-between" : "px-0 justify-center"} h-16 flex items-center border-b border-gray-100 bg-white`}>
        {expanded && (
          <div className="min-w-0">
            <div className="text-gray-900 font-medium text-base tracking-tight leading-none">Urus<span className="text-[var(--accent-600)]">POS</span></div>
            <div className="text-gray-400 text-[9px] font-medium tracking-widest uppercase mt-1.5">Dapur</div>
          </div>
        )}
        {mobile ? (
          <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <button onClick={() => setDesktopSidebarExpanded((v) => !v)} className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <Menu size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <nav className={`${expanded ? "px-4" : "px-3"} flex-1 py-5 overflow-y-auto bg-white`}>
        {expanded && <div className="text-gray-400 text-[10px] font-medium tracking-widest uppercase px-1 mb-3">Menu</div>}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 rounded-2xl mb-1 transition-all ${expanded ? "px-3 py-3" : "px-0 py-3 justify-center"} ${isActive ? "bg-[var(--accent-50)] text-[var(--accent-600)]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
              title={!expanded ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={1.8} className="shrink-0" />
              {expanded && (
                <div className="min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{item.description}</div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`${expanded ? "px-4" : "px-3"} pb-5 bg-white border-t border-gray-100 pt-4`}>
        <a href="/auth/logout" className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all mb-4 ${!expanded ? "justify-center px-0" : ""}`}>
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
          {expanded && <span className="text-sm font-medium">Log Keluar</span>}
        </a>
        {expanded ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] flex items-center justify-center text-[var(--accent-600)] text-sm font-medium shrink-0">{userInitial}</div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-900 text-sm font-medium truncate">{kitchenNama}</div>
                <div className="text-gray-400 text-xs font-medium mt-0.5">{kedaiNama || "Dapur"}</div>
              </div>
            </div>
          </div>
        ) : (
          <div title={kitchenNama} className="mx-auto w-10 h-10 rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] flex items-center justify-center text-[var(--accent-600)] text-sm font-medium">{userInitial}</div>
        )}
      </div>
    </>
  );

  const OrderCard = ({ order, variant }: { order: Order; variant: "pending" | "preparing" | "done" }) => {
    const mejaLabel = formatMeja(order.meja);
    const bungkus = isBungkus(order.meja);
    const itemCount = getOrderItemCount(order);
    const displayId = getOrderDisplayId(order);

    if (variant === "done") {
      return (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bungkus ? <ShoppingBag size={15} className="text-gray-400" strokeWidth={1.8} /> : <Utensils size={15} className="text-gray-400" strokeWidth={1.8} />}
                  <span className="text-gray-800 font-medium text-base">{mejaLabel}</span>
                </div>
                <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full">Siap</span>
              </div>
              <div className="text-gray-500 text-xs mt-1 font-mono">{displayId}</div>
            </div>
          </div>

          {/* Duration breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-gray-500 text-[10px] font-medium mb-0.5">Tunggu</div>
              <div className="text-gray-700 text-xs font-medium">{getWaitDuration(order)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-amber-500/70 text-[10px] font-medium mb-0.5">Masak</div>
              <div className="text-gray-700 text-xs font-medium">{getCookDuration(order) || "-"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-green-500/70 text-[10px] font-medium mb-0.5">Total</div>
              <div className="text-green-400 text-xs font-medium">{getTotalDuration(order)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <span className="text-green-600 font-medium text-base min-w-8">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-gray-500 text-sm line-through">{item.nama}</span>
                  {item.nota && <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => undoDone(order.id)} className="w-full bg-gray-100 text-gray-600 font-medium py-2.5 rounded-xl text-xs border border-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-gray-200">
            <RotateCcw size={12} strokeWidth={2} /> Undo Siap
          </button>
        </div>
      );
    }

    if (variant === "preparing") {
      return (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bungkus ? <ShoppingBag size={15} className="text-gray-500" strokeWidth={1.8} /> : <Utensils size={15} className="text-gray-500" strokeWidth={1.8} />}
                  <span className="text-gray-900 font-medium text-lg">{mejaLabel}</span>
                </div>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Sedang Siap
                </span>
              </div>
              <div className="text-gray-500 text-xs mt-1 font-mono">{displayId}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-gray-500 text-xs">{itemCount} item</span>
            </div>
          </div>

          {/* Live duration */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2">
              <Hourglass size={13} className="text-gray-400 shrink-0" strokeWidth={1.8} />
              <div>
                <div className="text-gray-500 text-[10px] font-medium">Masa Tunggu</div>
                <div className="text-gray-700 text-xs font-medium">{getWaitDuration(order)}</div>
              </div>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-2.5 flex items-center gap-2">
              <Flame size={13} className="text-amber-400 shrink-0" strokeWidth={1.8} />
              <div>
                <div className="text-amber-500/70 text-[10px] font-medium">Masa Masak</div>
                <div className="text-amber-300 text-xs font-medium">{getCookDuration(order)}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                <span className="text-amber-400 font-medium text-base min-w-8">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-gray-800 text-sm font-medium">{item.nama}</span>
                  {item.nota && <div className="flex items-center gap-1 text-gray-400 text-xs mt-1"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => markDone(order.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Check size={16} strokeWidth={2.2} /> Tandakan Siap
          </button>
        </div>
      );
    }

    // pending
    return (
      <div className="bg-white rounded-2xl p-4 border border-[var(--accent-100)] shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                {bungkus ? <ShoppingBag size={15} className="text-gray-500" strokeWidth={1.8} /> : <Utensils size={15} className="text-gray-500" strokeWidth={1.8} />}
                <span className="text-white font-medium text-lg">{mejaLabel}</span>
              </div>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                order.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-500/20 text-orange-400"
              }`}>
                {order.status === "paid" ? "Dah Bayar" : "Baru"}
              </span>
            </div>
            <div className="text-gray-500 text-xs mt-1 font-mono">{displayId}</div>
          </div>
          <div className="shrink-0 text-right">
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <Clock size={11} strokeWidth={2} /> {getWaitDuration(order)}
            </span>
            <div className="text-gray-400 text-xs mt-1">{itemCount} item</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <span className="text-orange-400 font-medium text-base min-w-8">{item.qty}×</span>
              <div className="min-w-0">
                <span className="text-gray-800 text-sm font-medium">{item.nama}</span>
                {item.nota && <div className="flex items-center gap-1 text-gray-400 text-xs mt-1"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => startPreparing(order.id)} className="w-full bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white font-medium py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <Flame size={16} strokeWidth={2} /> Mula Siapkan
        </button>
      </div>
    );
  };


  const accentThemeMap: Record<string, Record<string, string>> = {
    green: { "50":"#f0fdf4","100":"#dcfce7","200":"#bbf7d0","300":"#86efac","500":"#22c55e","600":"#16a34a","700":"#15803d","800":"#166534","900":"#14532d",gradientFrom:"#166534",gradientTo:"#22c55e",textOnAccent:"#ffffff" },
    blue: { "50":"#eff6ff","100":"#dbeafe","200":"#bfdbfe","300":"#93c5fd","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8","800":"#1e40af","900":"#1e3a8a",gradientFrom:"#1e40af",gradientTo:"#3b82f6",textOnAccent:"#ffffff" },
    purple: { "50":"#faf5ff","100":"#f3e8ff","200":"#e9d5ff","300":"#d8b4fe","500":"#a855f7","600":"#9333ea","700":"#7e22ce","800":"#6b21a8","900":"#581c87",gradientFrom:"#6b21a8",gradientTo:"#a855f7",textOnAccent:"#ffffff" },
    red: { "50":"#fef2f2","100":"#fee2e2","200":"#fecaca","300":"#fca5a5","500":"#ef4444","600":"#dc2626","700":"#b91c1c","800":"#991b1b","900":"#7f1d1d",gradientFrom:"#991b1b",gradientTo:"#ef4444",textOnAccent:"#ffffff" },
    orange: { "50":"#fff7ed","100":"#ffedd5","200":"#fed7aa","300":"#fdba74","500":"#f97316","600":"#ea580c","700":"#c2410c","800":"#9a3412","900":"#7c2d12",gradientFrom:"#9a3412",gradientTo:"#f97316",textOnAccent:"#ffffff" },
    amber: { "50":"#fffbeb","100":"#fef3c7","200":"#fde68a","300":"#fcd34d","500":"#f59e0b","600":"#d97706","700":"#b45309","800":"#92400e","900":"#78350f",gradientFrom:"#92400e",gradientTo:"#f59e0b",textOnAccent:"#ffffff" },
    pink: { "50":"#fdf2f8","100":"#fce7f3","200":"#fbcfe8","300":"#f9a8d4","500":"#ec4899","600":"#db2777","700":"#be185d","800":"#9d174d","900":"#831843",gradientFrom:"#9d174d",gradientTo:"#ec4899",textOnAccent:"#ffffff" },
    teal: { "50":"#f0fdfa","100":"#ccfbf1","200":"#99f6e4","300":"#5eead4","500":"#14b8a6","600":"#0d9488","700":"#0f766e","800":"#115e59","900":"#134e4a",gradientFrom:"#115e59",gradientTo:"#14b8a6",textOnAccent:"#ffffff" },
    indigo: { "50":"#eef2ff","100":"#e0e7ff","200":"#c7d2fe","300":"#a5b4fc","500":"#6366f1","600":"#4f46e5","700":"#4338ca","800":"#3730a3","900":"#312e81",gradientFrom:"#3730a3",gradientTo:"#6366f1",textOnAccent:"#ffffff" },
    slate: { "50":"#f8fafc","100":"#f1f5f9","200":"#e2e8f0","300":"#cbd5e1","500":"#64748b","600":"#475569","700":"#334155","800":"#1e293b","900":"#0f172a",gradientFrom:"#1e293b",gradientTo:"#64748b",textOnAccent:"#ffffff" },
  };

  const accentTheme = accentThemeMap[accentColor] || accentThemeMap.green;
  const accentStyle = {
    "--accent-50": accentTheme["50"],
    "--accent-100": accentTheme["100"],
    "--accent-200": accentTheme["200"],
    "--accent-300": accentTheme["300"],
    "--accent-500": accentTheme["500"],
    "--accent-600": accentTheme["600"],
    "--accent-700": accentTheme["700"],
    "--accent-800": accentTheme["800"],
    "--accent-900": accentTheme["900"],
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-[#f0f0eb] flex" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', ...accentStyle }}>

      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen bg-white border-r border-gray-100 flex-col transition-all duration-200 lg:flex ${desktopSidebarExpanded ? "w-64" : "w-20"}`}>
        <KitchenSidebar expanded={desktopSidebarExpanded} />
      </aside>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button onClick={() => setShowMobileMenu(false)} className="absolute inset-0 bg-black/60" />
          <div className="relative h-full w-72 bg-white shadow-xl flex flex-col animate-[slideInLeft_0.22s_ease-out]">
            <KitchenSidebar expanded mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${desktopSidebarExpanded ? "lg:ml-64" : "lg:ml-20"}`}>

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(true)} className="lg:hidden w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-2xl bg-gray-100 border border-gray-200">
              <Menu size={20} strokeWidth={1.8} />
            </button>
            <div>
              <div className="text-gray-900 font-medium text-sm">{navItems.find((n) => n.id === activeTab)?.label || "Dapur"}</div>
              <div className="text-gray-400 text-xs font-medium mt-0.5 hidden sm:block">{kedaiNama || kitchenNama}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-400 text-xs font-medium">Live</span>
            </div>
            <span className="text-gray-700 text-sm font-medium">{currentTime}</span>
            <div className="hidden sm:block text-gray-900 font-medium text-base tracking-tight">Urus<span className="text-[var(--accent-600)]">POS</span></div>
          </div>
        </div>

        {/* Stats Bar */}
        {activeTab === "orders" && (
          <>
          {/* Stats Bar - Desktop */}
          <div className="hidden sm:grid sm:grid-cols-5 bg-white px-6 py-3 gap-2 border-b border-gray-100 flex-shrink-0">
            {[
              { label: "Baru", count: pendingOrders.length, color: "text-orange-400", bg: "bg-orange-500/15", Icon: Clock },
              { label: "Menyiapkan", count: preparingOrders.length, color: "text-amber-400", bg: "bg-amber-500/15", Icon: Flame },
              { label: "Siap", count: doneOrders.length, color: "text-green-400", bg: "bg-green-500/15", Icon: CheckCircle2 },
              { label: "Dine-in", count: dineInCount, color: "text-blue-400", bg: "bg-blue-500/15", Icon: Utensils },
              { label: "Bungkus", count: takeawayCount, color: "text-yellow-400", bg: "bg-yellow-500/15", Icon: ShoppingBag },
            ].map(({ label, count, color, bg, Icon }) => (
              <div key={label} className="bg-gray-50 rounded-2xl px-3 py-2.5 border border-gray-100 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={color} strokeWidth={1.8} />
                </div>
                <div>
                  <div className={`${color} font-medium text-lg leading-none`}>{count}</div>
                  <div className="text-gray-400 text-[10px] mt-0.5 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar - Mobile compact */}
          <div className="sm:hidden grid grid-cols-5 bg-white px-3 py-2.5 gap-1.5 border-b border-gray-100 flex-shrink-0">
            {[
              { label: "Baru", count: pendingOrders.length, color: "text-orange-400", bg: "bg-orange-500/15", Icon: Clock },
              { label: "Siapkan", count: preparingOrders.length, color: "text-amber-400", bg: "bg-amber-500/15", Icon: Flame },
              { label: "Siap", count: doneOrders.length, color: "text-green-400", bg: "bg-green-500/15", Icon: CheckCircle2 },
              { label: "Dine-in", count: dineInCount, color: "text-blue-400", bg: "bg-blue-500/15", Icon: Utensils },
              { label: "Bungkus", count: takeawayCount, color: "text-yellow-400", bg: "bg-yellow-500/15", Icon: ShoppingBag },
            ].map(({ label, count, color, bg, Icon }) => (
              <div key={label} className={`${bg} rounded-2xl py-2 px-1 border border-gray-100 flex flex-col items-center justify-center gap-0.5`}>
                <Icon size={14} className={color} strokeWidth={1.8} />
                <div className={`${color} font-medium text-base leading-none`}>{count}</div>
                <div className="text-gray-400 text-[9px] font-medium">{label}</div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <>
            {/* Mobile 3-tab toggle */}
            <div className="md:hidden bg-white px-4 py-3 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                {[
                  { id: "baru", label: `Baru (${pendingOrders.length})`, active: "bg-orange-500" },
                  { id: "menyiapkan", label: `Siapkan (${preparingOrders.length})`, active: "bg-amber-500" },
                  { id: "siap", label: `Siap (${doneOrders.length})`, active: "bg-green-600" },
                ].map(({ id, label, active }) => (
                  <button key={id} onClick={() => setActiveMobileTab(id as any)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all ${activeMobileTab === id ? `${active} text-white` : "text-gray-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-400 text-sm font-medium">Memuatkan...</div>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden flex-1 overflow-y-auto p-4">
                  {activeMobileTab === "baru" && (
                    <div className="flex flex-col gap-3">
                      {pendingOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-12 font-medium">Tiada order baru</div>
                        : pendingOrders.map((o) => <OrderCard key={o.id} order={o} variant="pending" />)
                      }
                    </div>
                  )}
                  {activeMobileTab === "menyiapkan" && (
                    <div className="flex flex-col gap-3">
                      {preparingOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-12 font-medium">Tiada order sedang disiapkan</div>
                        : preparingOrders.map((o) => <OrderCard key={o.id} order={o} variant="preparing" />)
                      }
                    </div>
                  )}
                  {activeMobileTab === "siap" && (
                    <div className="flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-12 font-medium">Belum ada order siap</div>
                        : doneOrders.map((o) => <OrderCard key={o.id} order={o} variant="done" />)
                      }
                    </div>
                  )}
                </div>

                {/* Desktop 3-column */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                  {/* Baru Masuk */}
                  <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
                    <div className="bg-white px-5 py-3.5 flex-shrink-0 border-b border-gray-100 flex items-center gap-2">
                      <Clock size={14} className="text-orange-400" strokeWidth={2} />
                      <span className="text-orange-400 text-xs font-medium">Baru Masuk</span>
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{pendingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {pendingOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-10 font-medium">Tiada order baru</div>
                        : pendingOrders.map((o) => <OrderCard key={o.id} order={o} variant="pending" />)
                      }
                    </div>
                  </div>

                  {/* Menyiapkan */}
                  <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
                    <div className="bg-white px-5 py-3.5 flex-shrink-0 border-b border-gray-100 flex items-center gap-2">
                      <Flame size={14} className="text-amber-400" strokeWidth={2} />
                      <span className="text-amber-400 text-xs font-medium">Menyiapkan</span>
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{preparingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {preparingOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-10 font-medium">Tiada order sedang disiapkan</div>
                        : preparingOrders.map((o) => <OrderCard key={o.id} order={o} variant="preparing" />)
                      }
                    </div>
                  </div>

                  {/* Siap */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-white px-5 py-3.5 flex-shrink-0 border-b border-gray-100 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-400" strokeWidth={2} />
                      <span className="text-green-400 text-xs font-medium">Siap</span>
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{doneOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-gray-400 text-sm py-10 font-medium">Belum ada order siap</div>
                        : doneOrders.map((o) => <OrderCard key={o.id} order={o} variant="done" />)
                      }
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Rekod Tab */}
        {activeTab === "rekod" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f0f0eb]">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-gray-900 font-medium text-xl">Rekod Persiapan</h2>
                <p className="text-gray-400 text-xs font-medium mt-1">Sejarah pesanan yang telah disiapkan</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown((v) => !v)}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-full text-xs font-medium hover:border-gray-300 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Clock size={13} className="text-orange-400" strokeWidth={2} />
                  {rekodFilter === "hari_ini" ? "Hari Ini" : rekodFilter === "minggu_ini" ? "Minggu Ini" : rekodFilter === "custom" && customFrom ? `${customFrom}${customTo ? " → " + customTo : ""}` : "Bulan Ini"}
                  <span className="text-gray-400">▾</span>
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden min-w-[160px]">
                    {[
                      { id: "hari_ini", label: "Hari Ini" },
                      { id: "minggu_ini", label: "Minggu Ini" },
                      { id: "bulan_ini", label: "Bulan Ini" },
                      { id: "custom", label: "Tarikh Custom" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.id === "custom") {
                            setShowCustomDate(true);
                            setShowFilterDropdown(false);
                          } else {
                            setRekodFilter(opt.id as any);
                            setShowFilterDropdown(false);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 text-xs font-medium transition-all ${rekodFilter === opt.id ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Date Modal */}
                {showCustomDate && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <button onClick={() => setShowCustomDate(false)} className="absolute inset-0 bg-black/60" />
                    <div className="relative bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                      <h3 className="text-gray-900 font-medium text-sm mb-5 flex items-center gap-2">
                        <Clock size={15} className="text-orange-400" strokeWidth={2} />
                        Pilih Tarikh
                      </h3>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs font-medium mb-1.5 block">DARI</label>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] transition-all"
                        />
                      </div>
                      <div className="mb-5">
                        <label className="text-gray-500 text-xs font-medium mb-1.5 block">HINGGA</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowCustomDate(false)}
                          className="py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-all"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => { setRekodFilter("custom"); setShowCustomDate(false); }}
                          disabled={!customFrom}
                          className="py-3 rounded-2xl bg-[var(--accent-600)] text-white text-sm font-medium hover:bg-[var(--accent-700)] disabled:opacity-50 transition-all"
                        >
                          Guna
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {rekodOrders.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
                <ClipboardList size={34} className="text-gray-300 mx-auto mb-3" strokeWidth={1.8} />
                <div className="text-gray-400 text-sm font-medium">Belum ada rekod persiapan</div>
                <div className="text-gray-300 text-xs mt-1">Pesanan yang disiapkan akan dipaparkan di sini</div>
              </div>
            ) : (
              <div className="space-y-3">
                {rekodOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {isBungkus(order.meja) ? <ShoppingBag size={15} className="text-gray-400" strokeWidth={1.8} /> : <Utensils size={15} className="text-gray-400" strokeWidth={1.8} />}
                          <span className="text-gray-900 font-medium text-sm">{formatMeja(order.meja)}</span>
                          <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full">Siap</span>
                        </div>
                        <div className="text-gray-400 text-xs mt-1 font-mono">{getOrderDisplayId(order)}</div>
                      </div>
                    </div>

                    {/* Duration breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <div className="text-gray-400 text-[10px] font-medium mb-0.5">Masa Tunggu</div>
                        <div className="text-gray-700 text-xs font-medium">{getWaitDuration(order)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <div className="text-amber-500/70 text-[10px] font-medium mb-0.5">Masa Masak</div>
                        <div className="text-gray-700 text-xs font-medium">{getCookDuration(order) || "-"}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <div className="text-green-500/70 text-[10px] font-medium mb-0.5">Total</div>
                        <div className="text-green-400 text-xs font-medium">{getTotalDuration(order)}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="text-green-400 font-medium min-w-6">{item.qty}×</span>
                          <span className="text-gray-400 line-through">{item.nama}</span>
                          {item.nota && <span className="text-gray-400">— {item.nota}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="w-full lg:max-w-md mx-auto">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-4 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-50)] border border-[var(--accent-100)] flex items-center justify-center text-[var(--accent-600)] text-lg font-medium shrink-0">{userInitial}</div>
                <div className="min-w-0">
                  <div className="text-gray-900 text-sm font-medium truncate">{kitchenNama}</div>
                  <div className="text-gray-400 text-xs mt-0.5">Dapur</div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <h3 className="text-gray-900 font-medium text-sm flex items-center gap-2 mb-5">
                  <KeyRound size={16} className="text-[var(--accent-600)]" strokeWidth={2} />
                  Tukar Password
                </h3>
                {[
                  { label: "PASSWORD SEMASA", value: oldPassword, setter: setOldPassword },
                  { label: "PASSWORD BARU", value: newPassword, setter: setNewPassword },
                  { label: "CONFIRM PASSWORD BARU", value: confirmPassword, setter: setConfirmPassword },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="mb-3">
                    <label className="text-gray-500 text-xs font-medium mb-1 block">{label}</label>
                    <input type="password" value={value} onChange={(e) => setter(e.target.value)} placeholder="••••••"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/10 transition-all"
                    />
                  </div>
                ))}

                {passwordMsg && (
                  <div className={`text-xs font-medium mb-3 p-3 rounded-xl ${passwordMsg.includes("berjaya") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    {passwordMsg}
                  </div>
                )}

                <button onClick={tukarPasswordKitchen} disabled={!oldPassword || !newPassword || !confirmPassword}
                  className="w-full bg-[var(--accent-600)] hover:bg-[var(--accent-700)] text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all mt-1"
                >
                  Tukar Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}