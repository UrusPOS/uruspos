"use client";

import { useEffect, useState, useRef } from "react";
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
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [kitchenNama, setKitchenNama] = useState("Dapur");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"baru" | "menyiapkan" | "siap">("baru");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "rekod" | "password">("orders");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const now = useNow(10000);

  useEffect(() => {
    const session = getSession();
    if (session?.kedai_id) setKedaiId(session.kedai_id);
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

  async function fetchOrders() {
    const session = getSession();
    const kId = session?.kedai_id || null;
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["pending", "preparing", "paid", "done"])
      .order("created_at", { ascending: true });
    if (kId) query = query.eq("kedai_id", kId);
    const { data, error } = (await query) as any;
    if (!error) setOrders(data || []);
    setLoading(false);
  }

  async function startPreparing(id: string) {
    await supabase
      .from("orders")
      .update({ status: "preparing", preparing_at: new Date().toISOString() } as any)
      .eq("id", id);
    fetchOrders();
  }

  async function markDone(id: string) {
    await supabase
      .from("orders")
      .update({ status: "done", completed_at: new Date().toISOString() } as any)
      .eq("id", id);
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

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing" || o.status === "paid");
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
      <div className={`${expanded ? "px-5 justify-between" : "px-0 justify-center"} h-16 flex items-center border-b border-stone-800 bg-[#0c0a09]`}>
        {expanded && (
          <div className="min-w-0">
            <div className="text-white font-medium text-base tracking-tight leading-none">Urus<span className="text-orange-400">POS</span></div>
            <div className="text-stone-500 text-[9px] font-medium tracking-widest uppercase mt-1.5">Dapur</div>
          </div>
        )}
        {mobile ? (
          <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-white rounded-lg hover:bg-stone-800">
            <X size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <button onClick={() => setDesktopSidebarExpanded((v) => !v)} className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-all">
            <Menu size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <nav className={`${expanded ? "px-4" : "px-3"} flex-1 py-5 overflow-y-auto bg-[#0c0a09]`}>
        {expanded && <div className="text-stone-600 text-[10px] font-medium tracking-widest uppercase px-1 mb-3">Menu</div>}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 rounded-2xl mb-1 transition-all ${expanded ? "px-3 py-3" : "px-0 py-3 justify-center"} ${isActive ? "bg-orange-500/15 text-orange-400" : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"}`}
              title={!expanded ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={1.8} className="shrink-0" />
              {expanded && (
                <div className="min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="text-[10px] text-stone-600 font-medium truncate mt-0.5">{item.description}</div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`${expanded ? "px-4" : "px-3"} pb-5 bg-[#0c0a09] border-t border-stone-800 pt-4`}>
        <a href="/auth/logout" className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all mb-4 ${!expanded ? "justify-center px-0" : ""}`}>
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
          {expanded && <span className="text-sm font-medium">Log Keluar</span>}
        </a>
        {expanded ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium shrink-0">{userInitial}</div>
              <div className="min-w-0 flex-1">
                <div className="text-stone-200 text-sm font-medium truncate">{kitchenNama}</div>
                <div className="text-stone-500 text-xs font-medium mt-0.5">Dapur</div>
              </div>
            </div>
          </div>
        ) : (
          <div title={kitchenNama} className="mx-auto w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium">{userInitial}</div>
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
        <div className="bg-[#1a2e1a] rounded-2xl p-4 border border-green-900/40 opacity-75">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bungkus ? <ShoppingBag size={15} className="text-stone-400" strokeWidth={1.8} /> : <Utensils size={15} className="text-stone-400" strokeWidth={1.8} />}
                  <span className="text-stone-300 font-medium text-base">{mejaLabel}</span>
                </div>
                <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full">Siap</span>
              </div>
              <div className="text-stone-600 text-xs mt-1 font-mono">{displayId}</div>
            </div>
          </div>

          {/* Duration breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-stone-900/40 rounded-xl p-2 text-center">
              <div className="text-stone-400 text-[10px] font-medium mb-0.5">Tunggu</div>
              <div className="text-stone-300 text-xs font-medium">{getWaitDuration(order)}</div>
            </div>
            <div className="bg-stone-900/40 rounded-xl p-2 text-center">
              <div className="text-amber-500/70 text-[10px] font-medium mb-0.5">Masak</div>
              <div className="text-stone-300 text-xs font-medium">{getCookDuration(order) || "-"}</div>
            </div>
            <div className="bg-stone-900/40 rounded-xl p-2 text-center">
              <div className="text-green-500/70 text-[10px] font-medium mb-0.5">Total</div>
              <div className="text-green-400 text-xs font-medium">{getTotalDuration(order)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <span className="text-green-500/70 font-medium text-sm min-w-6">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-stone-500 text-sm line-through">{item.nama}</span>
                  {item.nota && <div className="flex items-center gap-1 text-stone-600 text-xs mt-0.5"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => undoDone(order.id)} className="w-full bg-stone-800/60 text-stone-400 font-medium py-2.5 rounded-xl text-xs border border-stone-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-stone-700/60">
            <RotateCcw size={12} strokeWidth={2} /> Undo Siap
          </button>
        </div>
      );
    }

    if (variant === "preparing") {
      return (
        <div className="bg-[#292524] rounded-2xl p-4 border border-amber-700/40 shadow-lg shadow-black/10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bungkus ? <ShoppingBag size={15} className="text-stone-300" strokeWidth={1.8} /> : <Utensils size={15} className="text-stone-300" strokeWidth={1.8} />}
                  <span className="text-white font-medium text-lg">{mejaLabel}</span>
                </div>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Sedang Siap
                </span>
              </div>
              <div className="text-stone-500 text-xs mt-1 font-mono">{displayId}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-stone-500 text-xs">{itemCount} item</span>
            </div>
          </div>

          {/* Live duration */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-stone-900/60 rounded-xl p-2.5 flex items-center gap-2">
              <Hourglass size={13} className="text-stone-500 shrink-0" strokeWidth={1.8} />
              <div>
                <div className="text-stone-600 text-[10px] font-medium">Masa Tunggu</div>
                <div className="text-stone-300 text-xs font-medium">{getWaitDuration(order)}</div>
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
              <div key={item.id} className="flex items-start gap-3 bg-[#1c1917] rounded-xl px-3 py-2.5 border border-stone-800">
                <span className="text-amber-400 font-medium text-base min-w-8">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-stone-100 text-sm font-medium">{item.nama}</span>
                  {item.nota && <div className="flex items-center gap-1 text-stone-500 text-xs mt-1"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
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
      <div className="bg-[#292524] rounded-2xl p-4 border border-orange-700/40 shadow-lg shadow-black/10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                {bungkus ? <ShoppingBag size={15} className="text-stone-300" strokeWidth={1.8} /> : <Utensils size={15} className="text-stone-300" strokeWidth={1.8} />}
                <span className="text-white font-medium text-lg">{mejaLabel}</span>
              </div>
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-medium px-2.5 py-0.5 rounded-full">Baru</span>
            </div>
            <div className="text-stone-500 text-xs mt-1 font-mono">{displayId}</div>
          </div>
          <div className="shrink-0 text-right">
            <span className="bg-stone-800 text-stone-400 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <Clock size={11} strokeWidth={2} /> {getWaitDuration(order)}
            </span>
            <div className="text-stone-600 text-xs mt-1">{itemCount} item</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3 bg-[#1c1917] rounded-xl px-3 py-2.5 border border-stone-800">
              <span className="text-orange-400 font-medium text-base min-w-8">{item.qty}×</span>
              <div className="min-w-0">
                <span className="text-stone-100 text-sm font-medium">{item.nama}</span>
                {item.nota && <div className="flex items-center gap-1 text-stone-500 text-xs mt-1"><AlertCircle size={10} strokeWidth={2} />{item.nota}</div>}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => startPreparing(order.id)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <Flame size={16} strokeWidth={2} /> Mula Siapkan
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1c1917] flex" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen bg-[#0c0a09] border-r border-stone-800 flex-col transition-all duration-200 lg:flex ${desktopSidebarExpanded ? "w-64" : "w-20"}`}>
        <KitchenSidebar expanded={desktopSidebarExpanded} />
      </aside>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button onClick={() => setShowMobileMenu(false)} className="absolute inset-0 bg-black/60" />
          <div className="relative h-full w-72 bg-[#0c0a09] shadow-xl flex flex-col animate-[slideInLeft_0.22s_ease-out]">
            <KitchenSidebar expanded mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${desktopSidebarExpanded ? "lg:ml-64" : "lg:ml-20"}`}>

        {/* Header */}
        <div className="bg-[#0c0a09] border-b border-stone-800 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(true)} className="lg:hidden w-10 h-10 flex items-center justify-center text-stone-400 hover:text-white rounded-2xl bg-stone-900 border border-stone-800">
              <Menu size={20} strokeWidth={1.8} />
            </button>
            <div>
              <div className="text-stone-200 font-medium text-sm">{navItems.find((n) => n.id === activeTab)?.label || "Dapur"}</div>
              <div className="text-stone-600 text-xs font-medium mt-0.5 hidden sm:block">{kitchenNama}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-stone-500 text-xs font-medium">Live</span>
            </div>
            <span className="text-stone-300 text-sm font-medium">{currentTime}</span>
            <div className="hidden sm:block text-white font-medium text-base tracking-tight">Urus<span className="text-orange-400">POS</span></div>
          </div>
        </div>

        {/* Stats Bar */}
        {activeTab === "orders" && (
          <div className="bg-[#0c0a09] px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 border-b border-stone-800 flex-shrink-0">
            {[
              { label: "Baru", count: pendingOrders.length, color: "text-orange-400", bg: "bg-orange-500/15", Icon: Clock },
              { label: "Menyiapkan", count: preparingOrders.length, color: "text-amber-400", bg: "bg-amber-500/15", Icon: Flame },
              { label: "Dine-in", count: dineInCount, color: "text-blue-400", bg: "bg-blue-500/15", Icon: Utensils },
              { label: "Bungkus", count: takeawayCount, color: "text-yellow-400", bg: "bg-yellow-500/15", Icon: ShoppingBag },
            ].map(({ label, count, color, bg, Icon }) => (
              <div key={label} className="bg-stone-900/60 rounded-2xl px-3 py-2.5 border border-stone-800 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={color} strokeWidth={1.8} />
                </div>
                <div>
                  <div className={`${color} font-medium text-lg leading-none`}>{count}</div>
                  <div className="text-stone-600 text-[10px] mt-0.5 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <>
            {/* Mobile 3-tab toggle */}
            <div className="md:hidden bg-[#0c0a09] px-4 py-3 border-b border-stone-800">
              <div className="grid grid-cols-3 gap-2 bg-stone-900 p-1 rounded-2xl border border-stone-800">
                {[
                  { id: "baru", label: `Baru (${pendingOrders.length})`, active: "bg-orange-500" },
                  { id: "menyiapkan", label: `Siapkan (${preparingOrders.length})`, active: "bg-amber-500" },
                  { id: "siap", label: `Siap (${doneOrders.length})`, active: "bg-green-600" },
                ].map(({ id, label, active }) => (
                  <button key={id} onClick={() => setActiveMobileTab(id as any)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all ${activeMobileTab === id ? `${active} text-white` : "text-stone-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-stone-500 text-sm font-medium">Memuatkan...</div>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden flex-1 overflow-y-auto p-4">
                  {activeMobileTab === "baru" && (
                    <div className="flex flex-col gap-3">
                      {pendingOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-12 font-medium">Tiada order baru</div>
                        : pendingOrders.map((o) => <OrderCard key={o.id} order={o} variant="pending" />)
                      }
                    </div>
                  )}
                  {activeMobileTab === "menyiapkan" && (
                    <div className="flex flex-col gap-3">
                      {preparingOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-12 font-medium">Tiada order sedang disiapkan</div>
                        : preparingOrders.map((o) => <OrderCard key={o.id} order={o} variant="preparing" />)
                      }
                    </div>
                  )}
                  {activeMobileTab === "siap" && (
                    <div className="flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-12 font-medium">Belum ada order siap</div>
                        : doneOrders.map((o) => <OrderCard key={o.id} order={o} variant="done" />)
                      }
                    </div>
                  )}
                </div>

                {/* Desktop 3-column */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                  {/* Baru Masuk */}
                  <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
                    <div className="bg-[#1c1917] px-5 py-3.5 flex-shrink-0 border-b border-stone-800 flex items-center gap-2">
                      <Clock size={14} className="text-orange-400" strokeWidth={2} />
                      <span className="text-orange-400 text-xs font-medium">Baru Masuk</span>
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{pendingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {pendingOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-10 font-medium">Tiada order baru</div>
                        : pendingOrders.map((o) => <OrderCard key={o.id} order={o} variant="pending" />)
                      }
                    </div>
                  </div>

                  {/* Menyiapkan */}
                  <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
                    <div className="bg-[#211f00] px-5 py-3.5 flex-shrink-0 border-b border-amber-900/30 flex items-center gap-2">
                      <Flame size={14} className="text-amber-400" strokeWidth={2} />
                      <span className="text-amber-400 text-xs font-medium">Menyiapkan</span>
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{preparingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {preparingOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-10 font-medium">Tiada order sedang disiapkan</div>
                        : preparingOrders.map((o) => <OrderCard key={o.id} order={o} variant="preparing" />)
                      }
                    </div>
                  </div>

                  {/* Siap */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-[#1a2e1a] px-5 py-3.5 flex-shrink-0 border-b border-green-900/40 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-400" strokeWidth={2} />
                      <span className="text-green-400 text-xs font-medium">Siap</span>
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{doneOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-10 font-medium">Belum ada order siap</div>
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="text-stone-200 font-medium text-xl">Rekod Persiapan</h2>
              <p className="text-stone-500 text-xs font-medium mt-1">Sejarah semua pesanan yang telah disiapkan</p>
            </div>

            {doneOrders.length === 0 ? (
              <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center">
                <ClipboardList size={34} className="text-stone-700 mx-auto mb-3" strokeWidth={1.8} />
                <div className="text-stone-500 text-sm font-medium">Belum ada rekod persiapan</div>
                <div className="text-stone-700 text-xs mt-1">Pesanan yang disiapkan akan dipaparkan di sini</div>
              </div>
            ) : (
              <div className="space-y-3">
                {doneOrders.map((order) => (
                  <div key={order.id} className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {isBungkus(order.meja) ? <ShoppingBag size={15} className="text-stone-400" strokeWidth={1.8} /> : <Utensils size={15} className="text-stone-400" strokeWidth={1.8} />}
                          <span className="text-stone-200 font-medium text-sm">{formatMeja(order.meja)}</span>
                          <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full">Siap</span>
                        </div>
                        <div className="text-stone-600 text-xs mt-1 font-mono">{getOrderDisplayId(order)}</div>
                      </div>
                    </div>

                    {/* Duration breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-stone-800/40 rounded-xl p-2 text-center">
                        <div className="text-stone-500 text-[10px] font-medium mb-0.5">Masa Tunggu</div>
                        <div className="text-stone-300 text-xs font-medium">{getWaitDuration(order)}</div>
                      </div>
                      <div className="bg-stone-800/40 rounded-xl p-2 text-center">
                        <div className="text-amber-500/70 text-[10px] font-medium mb-0.5">Masa Masak</div>
                        <div className="text-stone-300 text-xs font-medium">{getCookDuration(order) || "-"}</div>
                      </div>
                      <div className="bg-stone-800/40 rounded-xl p-2 text-center">
                        <div className="text-green-500/70 text-[10px] font-medium mb-0.5">Total</div>
                        <div className="text-green-400 text-xs font-medium">{getTotalDuration(order)}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <span className="text-green-400 font-medium min-w-6">{item.qty}×</span>
                          <span className="text-stone-400 line-through">{item.nama}</span>
                          {item.nota && <span className="text-stone-600">— {item.nota}</span>}
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
              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-lg font-medium shrink-0">{userInitial}</div>
                <div className="min-w-0">
                  <div className="text-stone-200 text-sm font-medium truncate">{kitchenNama}</div>
                  <div className="text-stone-500 text-xs mt-0.5">Dapur</div>
                </div>
              </div>

              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5">
                <h3 className="text-stone-200 font-medium text-sm flex items-center gap-2 mb-5">
                  <KeyRound size={16} className="text-orange-400" strokeWidth={2} />
                  Tukar Password
                </h3>
                {[
                  { label: "PASSWORD SEMASA", value: oldPassword, setter: setOldPassword },
                  { label: "PASSWORD BARU", value: newPassword, setter: setNewPassword },
                  { label: "CONFIRM PASSWORD BARU", value: confirmPassword, setter: setConfirmPassword },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="mb-3">
                    <label className="text-stone-500 text-xs font-medium mb-1 block">{label}</label>
                    <input type="password" value={value} onChange={(e) => setter(e.target.value)} placeholder="••••••"
                      className="w-full bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                    />
                  </div>
                ))}

                {passwordMsg && (
                  <div className={`text-xs font-medium mb-3 p-3 rounded-xl ${passwordMsg.includes("berjaya") ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                    {passwordMsg}
                  </div>
                )}

                <button onClick={tukarPasswordKitchen} disabled={!oldPassword || !newPassword || !confirmPassword}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all mt-1"
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