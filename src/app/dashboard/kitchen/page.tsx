"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChefHat,
  CheckCircle2,
  Clock,
  Package,
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
  completed_at: string | null;
  order_number: string | null;
  order_items: OrderItem[];
};

type KitchenSession = {
  kedai_id?: string;
  nama?: string;
  username?: string;
};

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [kitchenNama, setKitchenNama] = useState("Dapur");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"baru" | "siap">("baru");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "rekod" | "password">("orders");

  const [showTukarPassword, setShowTukarPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

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
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${h}:${m}`);
    }

    tick();
    const clockInterval = setInterval(tick, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(clockInterval);
    };
  }, []);

  function getSession(): KitchenSession | null {
    try {
      const cookies = document.cookie.split(";");
      const sessionCookie = cookies.find((c) => c.trim().startsWith("uruspos_session="));
      const sessionValue = sessionCookie?.split("=")?.[1];
      if (!sessionValue) return null;
      return JSON.parse(decodeURIComponent(sessionValue));
    } catch {
      return null;
    }
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
    const { data: currentUser } = (await supabase
      .from("users")
      .select("password, id")
      .eq("username", session?.username)
      .single()) as any;

    if (currentUser?.password !== oldPassword) { setPasswordMsg("Password semasa tidak betul."); return; }

    await supabase.from("users").update({ password: newPassword } as any).eq("id", currentUser.id);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMsg("Password berjaya ditukar!");
    setTimeout(() => { setPasswordMsg(""); setShowTukarPassword(false); }, 2000);
  }

  function getTimeDiff(created_at: string) {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
    if (diff < 2) return "Baru masuk";
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)} jam`;
  }

  function getDuration(created_at: string, completed_at: string | null) {
    if (!completed_at) return null;
    const diff = Math.floor((new Date(completed_at).getTime() - new Date(created_at).getTime()) / 60000);
    if (diff < 1) return "< 1 min";
    return `${diff} min`;
  }

  function formatMeja(meja: string | null) {
    if (!meja) return "Bungkus";
    const normalized = meja.toString().trim();
    const upper = normalized.toUpperCase();
    if (upper === "BUNGKUS" || upper === "TAKEAWAY" || upper === "TAKE AWAY") return "Bungkus";
    if (upper.startsWith("T") && !upper.startsWith("TABLE")) {
      const num = upper.replace("T", "");
      if (/^\d+$/.test(num)) return `Meja ${num}`;
    }
    if (/^\d+$/.test(normalized)) return `Meja ${normalized}`;
    if (normalized.toLowerCase().startsWith("meja")) return normalized;
    return normalized;
  }

  function isBungkus(meja: string | null) {
    const label = formatMeja(meja).toLowerCase();
    return label.includes("bungkus") || label.includes("takeaway");
  }

  function getStatusLabel(status: string) {
    if (status === "pending") return "Baru";
    if (status === "preparing") return "Sedang Siap";
    if (status === "paid") return "Dah Bayar";
    if (status === "done") return "Siap";
    return status;
  }

  function getOrderItemCount(order: Order) {
    return order.order_items?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;
  }

  function getOrderDisplayId(order: Order) {
    if (order.order_number) return order.order_number;
    return `#${order.id.slice(0, 8).toUpperCase()}`;
  }

  const newOrders = orders.filter((o) => o.status === "pending" || o.status === "preparing" || o.status === "paid");
  const doneOrders = orders.filter((o) => o.status === "done");
  const takeawayCount = newOrders.filter((o) => isBungkus(o.meja)).length;
  const dineInCount = newOrders.length - takeawayCount;

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
            <div className="text-white font-medium text-base tracking-tight leading-none">
              Urus<span className="text-orange-400">POS</span>
            </div>
            <div className="text-stone-500 text-[9px] font-medium tracking-widest uppercase mt-1.5">
              Dapur
            </div>
          </div>
        )}

        {mobile ? (
          <button
            onClick={() => setShowMobileMenu(false)}
            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        ) : (
          <button
            onClick={() => setDesktopSidebarExpanded((v) => !v)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-all"
          >
            <Menu size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <nav className={`${expanded ? "px-4" : "px-3"} flex-1 py-5 overflow-y-auto bg-[#0c0a09]`}>
        {expanded && (
          <div className="text-stone-600 text-[10px] font-medium tracking-widest uppercase px-1 mb-3">Menu</div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setShowMobileMenu(false); }}
              className={`w-full flex items-center gap-3 rounded-2xl mb-1 transition-all ${
                expanded ? "px-3 py-3" : "px-0 py-3 justify-center"
              } ${isActive ? "bg-orange-500/15 text-orange-400" : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-200"}`}
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
        <a
          href="/auth/logout"
          className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all mb-4 ${!expanded ? "justify-center px-0" : ""}`}
        >
          <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
          {expanded && <span className="text-sm font-medium">Log Keluar</span>}
        </a>

        {expanded ? (
          <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-stone-200 text-sm font-medium truncate">{kitchenNama}</div>
                <div className="text-stone-500 text-xs font-medium mt-0.5">Dapur</div>
              </div>
            </div>
          </div>
        ) : (
          <div title={kitchenNama} className="mx-auto w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-medium">
            {userInitial}
          </div>
        )}
      </div>
    </>
  );

  const OrderCard = ({ order, variant }: { order: Order; variant: "new" | "done" }) => {
    const mejaLabel = formatMeja(order.meja);
    const bungkus = isBungkus(order.meja);
    const itemCount = getOrderItemCount(order);
    const displayId = getOrderDisplayId(order);

    if (variant === "done") {
      return (
        <div className="bg-[#1a2e1a] rounded-2xl p-4 border border-green-900/40 opacity-80">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bungkus
                    ? <ShoppingBag size={16} className="text-stone-400" strokeWidth={1.8} />
                    : <Utensils size={16} className="text-stone-400" strokeWidth={1.8} />
                  }
                  <span className="text-stone-300 font-medium text-base">{mejaLabel}</span>
                </div>
                <span className="bg-green-500/20 text-green-400 text-[11px] font-medium px-2.5 py-1 rounded-full">
                  Siap
                </span>
              </div>
              <div className="text-stone-600 text-xs mt-1 font-mono">{displayId}</div>
            </div>

            <div className="text-right">
              {getDuration(order.created_at, order.completed_at) && (
                <div className="flex items-center gap-1 text-stone-500 text-xs font-medium">
                  <Timer size={12} strokeWidth={2} />
                  {getDuration(order.created_at, order.completed_at)}
                </div>
              )}
              <div className="text-stone-600 text-xs mt-1">{itemCount} item</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-green-500 font-medium text-sm min-w-7">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-stone-500 text-sm line-through">{item.nama}</span>
                  {item.nota && (
                    <div className="flex items-center gap-1 text-stone-600 text-xs mt-0.5">
                      <AlertCircle size={10} strokeWidth={2} />
                      {item.nota}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => undoDone(order.id)}
            className="w-full bg-green-500/10 text-green-400 font-medium py-3 rounded-xl text-xs border border-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-green-500/20"
          >
            <RotateCcw size={13} strokeWidth={2} />
            Undo Siap
          </button>
        </div>
      );
    }

    return (
      <div className="bg-[#292524] rounded-2xl p-4 border border-stone-700 shadow-lg shadow-black/10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                {bungkus
                  ? <ShoppingBag size={16} className="text-stone-300" strokeWidth={1.8} />
                  : <Utensils size={16} className="text-stone-300" strokeWidth={1.8} />
                }
                <span className="text-white font-medium text-lg">{mejaLabel}</span>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                order.status === "paid"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="text-stone-500 text-xs mt-1 font-mono">{displayId}</div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="bg-stone-800 text-stone-400 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
              <Clock size={11} strokeWidth={2} />
              {getTimeDiff(order.created_at)}
            </span>
            <span className="text-stone-500 text-xs">{itemCount} item</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3 bg-[#1c1917] rounded-xl px-3 py-2.5 border border-stone-800">
              <span className="text-orange-400 font-medium text-base min-w-8">{item.qty}×</span>
              <div className="min-w-0">
                <span className="text-stone-100 text-sm font-medium">{item.nama}</span>
                {item.nota && (
                  <div className="flex items-center gap-1 text-stone-500 text-xs mt-1">
                    <AlertCircle size={10} strokeWidth={2} />
                    {item.nota}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => markDone(order.id)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Check size={16} strokeWidth={2.2} />
          Tandakan Siap
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
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-stone-400 hover:text-white rounded-2xl bg-stone-900 border border-stone-800"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
            <div>
              <div className="text-stone-200 font-medium text-sm">
                {navItems.find((n) => n.id === activeTab)?.label || "Dapur"}
              </div>
              <div className="text-stone-600 text-xs font-medium mt-0.5 hidden sm:block">{kitchenNama}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-stone-500 text-xs font-medium">Live</span>
            </div>
            <span className="text-stone-300 text-sm font-medium">{currentTime}</span>
            <div className="hidden sm:block text-white font-medium text-base tracking-tight">
              Urus<span className="text-orange-400">POS</span>
            </div>
          </div>
        </div>

        {/* Stats Bar - only show on orders tab */}
        {activeTab === "orders" && (
          <div className="bg-[#0c0a09] px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 border-b border-stone-800 flex-shrink-0">
            <div className="bg-stone-900/60 rounded-2xl px-3 py-2.5 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <ChefHat size={15} className="text-orange-400" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-orange-400 font-medium text-lg leading-none">{newOrders.length}</div>
                <div className="text-stone-600 text-[10px] mt-0.5 font-medium">Perlu Siap</div>
              </div>
            </div>
            <div className="bg-stone-900/60 rounded-2xl px-3 py-2.5 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <CheckCircle2 size={15} className="text-green-400" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-green-400 font-medium text-lg leading-none">{doneOrders.length}</div>
                <div className="text-stone-600 text-[10px] mt-0.5 font-medium">Siap</div>
              </div>
            </div>
            <div className="bg-stone-900/60 rounded-2xl px-3 py-2.5 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Utensils size={15} className="text-blue-400" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-blue-400 font-medium text-lg leading-none">{dineInCount}</div>
                <div className="text-stone-600 text-[10px] mt-0.5 font-medium">Dine-in</div>
              </div>
            </div>
            <div className="bg-stone-900/60 rounded-2xl px-3 py-2.5 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                <ShoppingBag size={15} className="text-yellow-400" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-yellow-400 font-medium text-lg leading-none">{takeawayCount}</div>
                <div className="text-stone-600 text-[10px] mt-0.5 font-medium">Bungkus</div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <>
            {/* Mobile Tab Toggle */}
            <div className="md:hidden bg-[#0c0a09] px-4 py-3 border-b border-stone-800">
              <div className="grid grid-cols-2 gap-2 bg-stone-900 p-1 rounded-2xl border border-stone-800">
                <button
                  onClick={() => setActiveMobileTab("baru")}
                  className={`py-3 rounded-xl text-xs font-medium transition-all ${activeMobileTab === "baru" ? "bg-orange-500 text-white" : "text-stone-500"}`}
                >
                  Baru Masuk ({newOrders.length})
                </button>
                <button
                  onClick={() => setActiveMobileTab("siap")}
                  className={`py-3 rounded-xl text-xs font-medium transition-all ${activeMobileTab === "siap" ? "bg-green-600 text-white" : "text-stone-500"}`}
                >
                  Siap ({doneOrders.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-stone-500 text-sm font-medium">Memuatkan...</div>
              </div>
            ) : (
              <>
                {/* Mobile Orders */}
                <div className="md:hidden flex-1 overflow-y-auto p-4">
                  {activeMobileTab === "baru" ? (
                    <div className="flex flex-col gap-3">
                      {newOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-12 font-medium">Tiada order baru</div>
                        : newOrders.map((order) => <OrderCard key={order.id} order={order} variant="new" />)
                      }
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-12 font-medium">Belum ada order siap</div>
                        : doneOrders.map((order) => <OrderCard key={order.id} order={order} variant="done" />)
                      }
                    </div>
                  )}
                </div>

                {/* Desktop Split Panel */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                  <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
                    <div className="bg-[#1c1917] px-5 py-3.5 flex-shrink-0 border-b border-stone-800 flex items-center gap-2">
                      <Clock size={14} className="text-orange-400" strokeWidth={2} />
                      <span className="text-orange-400 text-xs font-medium tracking-wide">Baru Masuk</span>
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{newOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {newOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-10 font-medium">Tiada order baru</div>
                        : newOrders.map((order) => <OrderCard key={order.id} order={order} variant="new" />)
                      }
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-[#1a2e1a] px-5 py-3.5 flex-shrink-0 border-b border-green-900/40 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-400" strokeWidth={2} />
                      <span className="text-green-400 text-xs font-medium tracking-wide">Siap</span>
                      <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-1">{doneOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {doneOrders.length === 0
                        ? <div className="text-center text-stone-600 text-sm py-10 font-medium">Belum ada order siap</div>
                        : doneOrders.map((order) => <OrderCard key={order.id} order={order} variant="done" />)
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
                          {isBungkus(order.meja)
                            ? <ShoppingBag size={15} className="text-stone-400" strokeWidth={1.8} />
                            : <Utensils size={15} className="text-stone-400" strokeWidth={1.8} />
                          }
                          <span className="text-stone-200 font-medium text-sm">{formatMeja(order.meja)}</span>
                          <span className="bg-green-500/20 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full">Siap</span>
                        </div>
                        <div className="text-stone-600 text-xs mt-1 font-mono">{getOrderDisplayId(order)}</div>
                      </div>
                      <div className="text-right">
                        {getDuration(order.created_at, order.completed_at) && (
                          <div className="flex items-center gap-1 text-stone-500 text-xs font-medium">
                            <Timer size={11} strokeWidth={2} />
                            {getDuration(order.created_at, order.completed_at)}
                          </div>
                        )}
                        <div className="text-stone-600 text-xs mt-1">{getOrderItemCount(order)} item</div>
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
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 text-lg font-medium shrink-0">
                  {userInitial}
                </div>
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

                <div className="mb-3">
                  <label className="text-stone-500 text-xs font-medium mb-1 block">PASSWORD SEMASA</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>
                <div className="mb-3">
                  <label className="text-stone-500 text-xs font-medium mb-1 block">PASSWORD BARU</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-stone-500 text-xs font-medium mb-1 block">CONFIRM PASSWORD BARU</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-stone-800/60 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>

                {passwordMsg && (
                  <div className={`text-xs font-medium mb-3 p-3 rounded-xl ${passwordMsg.includes("berjaya") ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                    {passwordMsg}
                  </div>
                )}

                <button
                  onClick={tukarPasswordKitchen}
                  disabled={!oldPassword || !newPassword || !confirmPassword}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
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