"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  const [showTukarPassword, setShowTukarPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    const session = getSession();

    if (session?.kedai_id) {
      setKedaiId(session.kedai_id);
    }

    if (session?.nama) {
      setKitchenNama(session.nama);
    }

    fetchOrders();

    const channel = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchOrders();
      })
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

    if (kId) {
      query = query.eq("kedai_id", kId);
    }

    const { data, error } = (await query) as any;

    if (!error) {
      setOrders(data || []);
    }

    setLoading(false);
  }

  async function markDone(id: string) {
    await supabase
      .from("orders")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      } as any)
      .eq("id", id);

    fetchOrders();
  }

  async function undoDone(id: string) {
    await supabase
      .from("orders")
      .update({
        status: "preparing",
        completed_at: null,
      } as any)
      .eq("id", id);

    fetchOrders();
  }

  async function tukarPasswordKitchen() {
    if (!newPassword.trim()) return;

    if (newPassword !== confirmPassword) {
      setPasswordMsg("❌ Password baru tidak sepadan.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg("❌ Password kena sekurang-kurangnya 6 aksara.");
      return;
    }

    const session = getSession();

    const { data: currentUser } = (await supabase
      .from("users")
      .select("password, id")
      .eq("username", session?.username)
      .single()) as any;

    if (currentUser?.password !== oldPassword) {
      setPasswordMsg("❌ Password semasa tidak betul.");
      return;
    }

    await supabase.from("users").update({ password: newPassword } as any).eq("id", currentUser.id);

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg("✅ Password berjaya ditukar!");

    setTimeout(() => {
      setPasswordMsg("");
      setShowTukarPassword(false);
    }, 2000);
  }

  function getTimeDiff(created_at: string) {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);

    if (diff < 2) return "Baru masuk";
    if (diff < 60) return `${diff} min lepas`;

    return `${Math.floor(diff / 60)} jam lepas`;
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

    if (upper === "BUNGKUS" || upper === "TAKEAWAY" || upper === "TAKE AWAY") {
      return "Bungkus";
    }

    if (upper.startsWith("T") && !upper.startsWith("TABLE")) {
      const tableNumber = upper.replace("T", "");
      if (/^\d+$/.test(tableNumber)) return `Meja ${tableNumber}`;
    }

    if (/^\d+$/.test(normalized)) {
      return `Meja ${normalized}`;
    }

    if (normalized.toLowerCase().startsWith("meja")) {
      return normalized;
    }

    return normalized;
  }

  function isBungkus(meja: string | null) {
    const label = formatMeja(meja).toLowerCase();
    return label.includes("bungkus") || label.includes("takeaway") || label.includes("take away");
  }

  function getStatusLabel(status: string) {
    if (status === "pending") return "Baru";
    if (status === "preparing") return "Preparing";
    if (status === "paid") return "Dah Bayar";
    if (status === "done") return "Siap";
    return status;
  }

  function getOrderItemCount(order: Order) {
    return order.order_items?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;
  }

  const newOrders = orders.filter((o) => o.status === "pending" || o.status === "preparing" || o.status === "paid");
  const doneOrders = orders.filter((o) => o.status === "done");
  const takeawayCount = newOrders.filter((o) => isBungkus(o.meja)).length;
  const dineInCount = newOrders.length - takeawayCount;

  const OrderCard = ({ order, variant }: { order: Order; variant: "new" | "done" }) => {
    const mejaLabel = formatMeja(order.meja);
    const bungkus = isBungkus(order.meja);
    const itemCount = getOrderItemCount(order);

    if (variant === "done") {
      return (
        <div className="bg-[#1a2e1a] rounded-2xl p-4 border border-green-900/40 opacity-80">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-300 font-black text-base">{bungkus ? "🥡" : "🍽️"} {mejaLabel}</span>
                <span className="bg-green-500/20 text-green-400 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Siap
                </span>
              </div>
              <div className="text-stone-600 text-xs mt-1">{order.order_number || "ORD-LAMA"}</div>
            </div>

            <div className="text-right">
              {getDuration(order.created_at, order.completed_at) && (
                <div className="text-stone-500 text-xs font-bold">⏱ {getDuration(order.created_at, order.completed_at)}</div>
              )}
              <div className="text-stone-600 text-xs mt-1">{itemCount} item</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-green-500 font-black text-sm min-w-7">{item.qty}×</span>
                <div className="min-w-0">
                  <span className="text-stone-500 text-sm line-through">{item.nama}</span>
                  {item.nota && <div className="text-stone-600 text-xs mt-0.5">📝 {item.nota}</div>}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => undoDone(order.id)}
            className="w-full bg-green-500/20 text-green-400 font-bold py-3 rounded-xl text-xs border border-green-500/30 active:scale-[0.98] transition-all"
          >
            ↩ Undo Siap
          </button>
        </div>
      );
    }

    return (
      <div className="bg-[#292524] rounded-2xl p-4 border border-stone-700 shadow-lg shadow-black/10">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white font-black text-lg">{bungkus ? "🥡" : "🍽️"} {mejaLabel}</span>
              <span className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${
                order.status === "paid"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="text-stone-500 text-xs mt-1">{order.order_number || "ORD-LAMA"}</div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
              {getTimeDiff(order.created_at)}
            </span>
            <span className="text-stone-500 text-xs">{itemCount} item</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3 bg-[#1c1917] rounded-xl px-3 py-2.5 border border-stone-800">
              <span className="text-orange-400 font-black text-base min-w-8">{item.qty}×</span>
              <div className="min-w-0">
                <span className="text-stone-100 text-sm font-bold">{item.nama}</span>
                {item.nota && <div className="text-stone-500 text-xs mt-1">📝 {item.nota}</div>}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => markDone(order.id)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all"
        >
          ✓ Tandakan Siap
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1c1917] flex flex-col">
      {/* Header */}
      <div className="bg-[#0c0a09] px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-stone-800 sticky top-0 z-30">
        <div className="min-w-0">
          <div>
            <span className="text-white font-black text-lg">Urus<span className="text-orange-400">POS</span></span>
            <span className="ml-2 text-stone-500 text-sm">Dapur</span>
          </div>
          <div className="text-stone-500 text-xs truncate max-w-[180px] sm:max-w-none">{kitchenNama}</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-stone-400 text-xs">Live</span>
          </div>
          <span className="text-stone-300 text-sm font-black">{currentTime}</span>
          <button
            onClick={() => setShowTukarPassword(true)}
            className="w-9 h-9 sm:w-auto sm:h-auto rounded-xl sm:rounded-none bg-stone-900 sm:bg-transparent text-amber-400 text-xs font-bold px-2 py-1 border border-stone-800 sm:border-0"
            title="Tukar Password"
          >
            🔑
          </button>
          <a href="/auth/logout" className="text-stone-500 text-xs font-bold">Keluar</a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[#0c0a09] px-4 sm:px-5 py-3 grid grid-cols-4 gap-2 border-b border-stone-800 flex-shrink-0">
        <div className="bg-[#1c1917] rounded-2xl px-3 py-2 border border-stone-800">
          <div className="text-orange-400 font-black text-xl leading-none">{newOrders.length}</div>
          <div className="text-stone-500 text-[11px] mt-1">Perlu Siap</div>
        </div>
        <div className="bg-[#1c1917] rounded-2xl px-3 py-2 border border-stone-800">
          <div className="text-green-400 font-black text-xl leading-none">{doneOrders.length}</div>
          <div className="text-stone-500 text-[11px] mt-1">Siap</div>
        </div>
        <div className="bg-[#1c1917] rounded-2xl px-3 py-2 border border-stone-800">
          <div className="text-blue-400 font-black text-xl leading-none">{dineInCount}</div>
          <div className="text-stone-500 text-[11px] mt-1">Dine-in</div>
        </div>
        <div className="bg-[#1c1917] rounded-2xl px-3 py-2 border border-stone-800">
          <div className="text-yellow-400 font-black text-xl leading-none">{takeawayCount}</div>
          <div className="text-stone-500 text-[11px] mt-1">Bungkus</div>
        </div>
      </div>

      {/* Mobile View Toggle */}
      <div className="md:hidden bg-[#0c0a09] px-4 py-3 border-b border-stone-800">
        <div className="grid grid-cols-2 gap-2 bg-[#1c1917] p-1 rounded-2xl border border-stone-800">
          <button
            onClick={() => setActiveMobileTab("baru")}
            className={`py-3 rounded-xl text-xs font-black transition-all ${
              activeMobileTab === "baru"
                ? "bg-orange-500 text-white"
                : "text-stone-500"
            }`}
          >
            Baru Masuk ({newOrders.length})
          </button>
          <button
            onClick={() => setActiveMobileTab("siap")}
            className={`py-3 rounded-xl text-xs font-black transition-all ${
              activeMobileTab === "siap"
                ? "bg-green-500 text-white"
                : "text-stone-500"
            }`}
          >
            Siap ({doneOrders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-stone-500 text-sm">Loading...</div>
        </div>
      ) : (
        <>
          {/* Mobile Orders */}
          <div className="md:hidden flex-1 overflow-y-auto p-4">
            {activeMobileTab === "baru" ? (
              <div className="flex flex-col gap-3">
                {newOrders.length === 0 ? (
                  <div className="text-center text-stone-600 text-sm py-12">Tiada order baru 🎉</div>
                ) : (
                  newOrders.map((order) => <OrderCard key={order.id} order={order} variant="new" />)
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {doneOrders.length === 0 ? (
                  <div className="text-center text-stone-600 text-sm py-12">Belum ada order siap</div>
                ) : (
                  doneOrders.map((order) => <OrderCard key={order.id} order={order} variant="done" />)
                )}
              </div>
            )}
          </div>

          {/* Desktop / Tablet Orders */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {/* New Orders */}
            <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
              <div className="bg-[#292524] px-4 py-3 flex-shrink-0 border-b border-stone-700">
                <span className="text-orange-400 text-xs font-black tracking-widest uppercase">⏳ Baru Masuk ({newOrders.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {newOrders.length === 0 ? (
                  <div className="text-center text-stone-600 text-sm py-10">Tiada order baru 🎉</div>
                ) : (
                  newOrders.map((order) => <OrderCard key={order.id} order={order} variant="new" />)
                )}
              </div>
            </div>

            {/* Done Orders */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#1a2e1a] px-4 py-3 flex-shrink-0 border-b border-green-900/50">
                <span className="text-green-400 text-xs font-black tracking-widest uppercase">✅ Siap ({doneOrders.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {doneOrders.length === 0 ? (
                  <div className="text-center text-stone-600 text-sm py-10">Belum ada order siap</div>
                ) : (
                  doneOrders.map((order) => <OrderCard key={order.id} order={order} variant="done" />)
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tukar Password Modal */}
      {showTukarPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-[#1a0e35] rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm border border-purple-500/30">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="text-white font-bold text-lg">🔑 Tukar Password</h3>
                <p className="text-purple-400 text-xs mt-1">Kemaskini password akaun dapur.</p>
              </div>
              <button
                onClick={() => {
                  setShowTukarPassword(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordMsg("");
                }}
                className="w-9 h-9 rounded-xl bg-purple-900/60 text-purple-200 font-black"
              >
                ×
              </button>
            </div>

            <div className="mb-3">
              <label className="text-purple-400 text-xs font-bold mb-1 block">PASSWORD SEMASA</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>

            <div className="mb-3">
              <label className="text-purple-400 text-xs font-bold mb-1 block">PASSWORD BARU</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>

            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>

            {passwordMsg && (
              <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${
                passwordMsg.includes("✅")
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}>
                {passwordMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTukarPassword(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordMsg("");
                }}
                className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700"
              >
                Batal
              </button>
              <button
                onClick={tukarPasswordKitchen}
                disabled={!oldPassword || !newPassword || !confirmPassword}
                className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                Tukar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
