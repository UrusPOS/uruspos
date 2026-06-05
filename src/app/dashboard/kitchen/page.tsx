"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  id: string;
  nama: string;
  qty: number;
  nota: string;
};

type Order = {
  id: string;
  meja: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  order_number: string | null;
  order_items: OrderItem[];
};

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [kitchenNama, setKitchenNama] = useState("Dapur");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [showTukarPassword, setShowTukarPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    // Get session
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    if (sessionValue) {
      const session = JSON.parse(decodeURIComponent(sessionValue));
      setKedaiId(session.kedai_id);
      setKitchenNama(session.nama);
    }

    fetchOrders();

    const channel = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
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

  async function fetchOrders() {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    let kId = null;
    if (sessionValue) {
      const session = JSON.parse(decodeURIComponent(sessionValue));
      kId = session.kedai_id;
    }

    const query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["pending", "preparing", "paid", "done"])
      .order("created_at", { ascending: true });

    if (kId) query.eq("kedai_id", kId);

    const { data } = await query as any;
    setOrders(data || []);
    setLoading(false);
  }

  async function markDone(id: string) {
    const { data: order } = await supabase.from("orders").select("status").eq("id", id).single() as any;
    await supabase.from("orders").update({
      status: "done",
      completed_at: new Date().toISOString()
    } as any).eq("id", id);
    fetchOrders();
  }

  async function undoDone(id: string) {
    await supabase.from("orders").update({ status: "preparing", completed_at: null } as any).eq("id", id);
    fetchOrders();
  }

  async function tukarPasswordKitchen() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) { setPasswordMsg("❌ Password baru tidak sepadan."); return; }
    if (newPassword.length < 6) { setPasswordMsg("❌ Password kena sekurang-kurangnya 6 aksara."); return; }
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    const session = sessionValue ? JSON.parse(decodeURIComponent(sessionValue)) : null;
    const { data: currentUser } = await supabase.from("users").select("password, id").eq("username", session?.username).single() as any;
    if (currentUser?.password !== oldPassword) { setPasswordMsg("❌ Password semasa tidak betul."); return; }
    await supabase.from("users").update({ password: newPassword } as any).eq("id", currentUser.id);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMsg("✅ Password berjaya ditukar!");
    setTimeout(() => { setPasswordMsg(""); setShowTukarPassword(false); }, 2000);
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

  const newOrders = orders.filter((o) => o.status === "pending" || o.status === "preparing" || o.status === "paid");
  const doneOrders = orders.filter((o) => o.status === "done");

  return (
    <div className="min-h-screen bg-[#1c1917] flex flex-col">
      {/* Header */}
      <div className="bg-[#0c0a09] px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-stone-800">
        <div>
          <span className="text-white font-bold text-lg">Urus<span className="text-orange-400">POS</span></span>
          <span className="ml-2 text-stone-500 text-sm">Dapur</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-stone-400 text-xs">Live</span>
          </div>
          <span className="text-stone-300 text-sm font-bold">{currentTime}</span>
          <button onClick={() => setShowTukarPassword(true)} className="text-amber-400 text-xs font-bold px-2 py-1">🔑</button>
          <a href="/auth/logout" className="text-stone-500 text-xs">Keluar</a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[#0c0a09] px-5 py-2 flex gap-4 border-b border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 font-black text-lg">{newOrders.length}</span>
          <span className="text-stone-500 text-xs">Perlu Siapkan</span>
        </div>
        <div className="w-px bg-stone-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-black text-lg">{doneOrders.length}</span>
          <span className="text-stone-500 text-xs">Dah Siap</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-stone-500 text-sm">Loading...</div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* New Orders */}
          <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
            <div className="bg-[#292524] px-4 py-2 flex-shrink-0 border-b border-stone-700">
              <span className="text-orange-400 text-xs font-black tracking-widest uppercase">⏳ Baru Masuk ({newOrders.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {newOrders.length === 0 ? (
                <div className="text-center text-stone-600 text-sm py-8">Tiada order baru 🎉</div>
              ) : (
                newOrders.map((order) => (
                  <div key={order.id} className="bg-[#292524] rounded-2xl p-3 border border-stone-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-black text-sm">Meja {order.meja}</span>
                        <div className="text-stone-500 text-xs mt-0.5">{order.order_number || "ORD-LAMA"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded-full">{getTimeDiff(order.created_at)}</span>
                        {order.status === "paid" && (
                          <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">💳 Dah Bayar</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <span className="text-orange-400 font-black text-sm min-w-6">{item.qty}×</span>
                          <div>
                            <span className="text-stone-200 text-sm font-medium">{item.nama}</span>
                            {item.nota && <div className="text-stone-500 text-xs mt-0.5">📝 {item.nota}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => markDone(order.id)} className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all">
                      ✓ Tandakan Siap
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Done Orders */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-[#1a2e1a] px-4 py-2 flex-shrink-0 border-b border-green-900/50">
              <span className="text-green-400 text-xs font-black tracking-widest uppercase">✅ Siap ({doneOrders.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {doneOrders.length === 0 ? (
                <div className="text-center text-stone-600 text-sm py-8">Belum ada siap</div>
              ) : (
                doneOrders.map((order) => (
                  <div key={order.id} className="bg-[#1a2e1a] rounded-2xl p-3 border border-green-900/40 opacity-70">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-stone-400 font-black text-sm">Meja {order.meja}</span>
                        <div className="text-stone-600 text-xs mt-0.5">{order.order_number || "ORD-LAMA"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">Siap ✓</span>
                        {getDuration(order.created_at, order.completed_at) && (
                          <span className="text-stone-500 text-xs">⏱ {getDuration(order.created_at, order.completed_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-green-500 font-black text-sm min-w-6">{item.qty}×</span>
                          <span className="text-stone-500 text-sm line-through">{item.nama}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => undoDone(order.id)} className="w-full bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-xs border border-green-500/30">↩ Undo</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tukar Password Modal */}
      {showTukarPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30">
            <h3 className="text-white font-bold text-lg mb-6">🔑 Tukar Password</h3>
            <div className="mb-3">
              <label className="text-purple-400 text-xs font-bold mb-1 block">PASSWORD SEMASA</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            <div className="mb-3">
              <label className="text-purple-400 text-xs font-bold mb-1 block">PASSWORD BARU</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400" />
            </div>
            {passwordMsg && (
              <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsg.includes("✅") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{passwordMsg}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowTukarPassword(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordMsg(""); }} className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700">Batal</button>
              <button onClick={tukarPasswordKitchen} disabled={!oldPassword || !newPassword || !confirmPassword} className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">Tukar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}