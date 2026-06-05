"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Produk = {
  id: string;
  nama: string;
  harga_jual: number;
  kos_beli: number;
  stok: number;
};

type CartItem = Produk & { qty: number };

export default function StaffDashboardPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [currentMeja, setCurrentMeja] = useState("T1");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [staffNama, setStaffNama] = useState("Staff");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("pos");
  const [rekod, setRekod] = useState<any[]>([]);
  const [loadingRekod, setLoadingRekod] = useState(false);
  const [showTukarPassword, setShowTukarPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPasswordStaff, setNewPasswordStaff] = useState("");
  const [confirmPasswordStaff, setConfirmPasswordStaff] = useState("");
  const [passwordMsgStaff, setPasswordMsgStaff] = useState("");

  const mejaList = ["T1", "T2", "T3", "T4", "T5", "T6", "Bungkus"];

  useEffect(() => {
    fetchProduk();
  }, []);

  async function fetchProduk() {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    let kId = null;
    if (sessionValue) {
      const session = JSON.parse(decodeURIComponent(sessionValue));
      kId = session.kedai_id;
      setKedaiId(kId);
      setStaffNama(session.nama);
    }
    if (!kId) { setLoading(false); return; }
    const { data } = await supabase.from("produk").select("*").eq("is_active", true).eq("kedai_id", kId).order("nama");
    setProduk(data || []);
    setLoading(false);
  }

  async function fetchRekod() {
    setLoadingRekod(true);
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    let kId = null;
    if (sessionValue) {
      const session = JSON.parse(decodeURIComponent(sessionValue));
      kId = session.kedai_id;
    }
    const query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(50);
    if (kId) query.eq("kedai_id", kId);
    const { data } = await query as any;
    setRekod(data || []);
    setLoadingRekod(false);
  }

  function addToCart(item: Produk) {
    if (item.stok === 0) return;
    setCart((prev) => ({ ...prev, [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 } }));
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) { const updated = { ...prev }; delete updated[id]; return updated; }
      return { ...prev, [id]: { ...current, qty: newQty } };
    });
  }

  function clearCart() { setCart({}); setOrderSent(false); setCurrentOrderId(null); }

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, i) => s + i.harga_jual * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  async function sendOrder() {
    if (cartItems.length === 0) return;
    setSaving(true);
    const { data: order } = await supabase.from("orders").insert({ meja: currentMeja, status: "pending", total, kedai_id: kedaiId }).select().single() as any;
    if (!order) { setSaving(false); return; }
    const items = cartItems.map((item) => ({ order_id: order.id, produk_id: item.id, nama: item.nama, qty: item.qty, harga: item.harga_jual, kos: item.kos_beli, nota: "" }));
    await supabase.from("order_items").insert(items);
    await supabase.from("orders").update({ status: "preparing" } as any).eq("id", order.id);
    setCurrentOrderId(order.id);
    setOrderSent(true);
    setSaving(false);
  }

  async function completePayment() {
    if (!currentOrderId) return;
    setSaving(true);
    await supabase.from("orders").update({ status: "paid" } as any).eq("id", currentOrderId);
    for (const item of cartItems) {
      const produkItem = produk.find((p) => p.id === item.id);
      if (produkItem) {
        const newStok = Math.max(0, produkItem.stok - item.qty);
        await supabase.from("produk").update({ stok: newStok } as any).eq("id", item.id);
      }
    }
    setLastTotal(total);
    setShowCheckout(false);
    setShowSuccess(true);
    setSaving(false);
    fetchProduk();
  }

  async function tukarPasswordStaff() {
    if (!newPasswordStaff.trim()) return;
    if (newPasswordStaff !== confirmPasswordStaff) { setPasswordMsgStaff("❌ Password baru tidak sepadan."); return; }
    if (newPasswordStaff.length < 6) { setPasswordMsgStaff("❌ Password kena sekurang-kurangnya 6 aksara."); return; }
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("uruspos_session="));
    const sessionValue = sessionCookie?.split("=")?.[1];
    const session = sessionValue ? JSON.parse(decodeURIComponent(sessionValue)) : null;
    const { data: currentUser } = await supabase.from("users").select("password, id").eq("username", session?.username).single() as any;
    if (currentUser?.password !== oldPassword) { setPasswordMsgStaff("❌ Password semasa tidak betul."); return; }
    await supabase.from("users").update({ password: newPasswordStaff } as any).eq("id", currentUser.id);
    setOldPassword(""); setNewPasswordStaff(""); setConfirmPasswordStaff("");
    setPasswordMsgStaff("✅ Password berjaya ditukar!");
    setTimeout(() => { setPasswordMsgStaff(""); setShowTukarPassword(false); }, 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-gray-900 font-bold text-lg">Urus<span className="text-green-600">POS</span></span>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab("pos")} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeTab === "pos" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
            🛒 POS
          </button>
          <button onClick={() => { setActiveTab("rekod"); fetchRekod(); }} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${activeTab === "rekod" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
            📋 Rekod
          </button>
          <button onClick={() => setShowTukarPassword(true)} className="text-amber-500 text-xs font-bold px-2 py-1.5">🔑</button>
          <a href="/auth/logout" className="text-gray-400 text-xs">Keluar</a>
        </div>
      </div>

      {/* POS TAB */}
      {activeTab === "pos" && (
        <>
          {/* Meja Selector */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
            {mejaList.map((meja) => (
              <button key={meja} onClick={() => { setCurrentMeja(meja); clearCart(); }} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${currentMeja === meja ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200"}`}>
                {meja}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-gray-400 py-10">Loading menu...</div>
            ) : produk.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🍽️</div>
                <div className="text-gray-400 text-sm">Tiada produk lagi</div>
                <div className="text-gray-300 text-xs mt-1">Owner perlu tambah produk dulu</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {produk.map((item) => (
                  <button key={item.id} onClick={() => addToCart(item)} disabled={item.stok === 0}
                    className={`bg-white rounded-2xl p-3 text-center border-2 transition-all shadow-sm relative ${cart[item.id]?.qty > 0 ? "border-green-500 bg-green-50" : "border-gray-100"} ${item.stok === 0 ? "opacity-40" : "active:scale-95"}`}
                  >
                    {cart[item.id]?.qty > 0 && (
                      <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">{cart[item.id].qty}</div>
                    )}
                    <div className="text-2xl mb-1">🍽️</div>
                    <div className="text-gray-900 text-xs font-bold leading-tight">{item.nama}</div>
                    <div className="text-green-600 text-xs font-black mt-1">RM {item.harga_jual.toFixed(2)}</div>
                    {item.stok <= 5 && item.stok > 0 && <div className="text-amber-500 text-xs mt-0.5">Tinggal {item.stok}</div>}
                    {item.stok === 0 && <div className="text-red-400 text-xs mt-0.5">Habis</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Order Panel */}
          <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-900 font-bold text-sm">
                Pesanan — {currentMeja}
                {cartCount > 0 && <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{cartCount} item</span>}
              </span>
              {cartCount > 0 && <button onClick={clearCart} className="text-red-400 text-xs font-bold bg-red-50 px-3 py-1 rounded-full">Kosong</button>}
            </div>
            {cartItems.length > 0 && (
              <div className="flex flex-col gap-2 mb-3 max-h-32 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-gray-700 text-xs flex-1 font-medium">{item.nama}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg border border-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center">−</button>
                      <span className="text-gray-900 text-xs font-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg border border-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center">+</button>
                    </div>
                    <span className="text-gray-900 text-xs font-bold w-16 text-right">RM {(item.harga_jual * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {cartItems.length === 0 && <div className="text-center text-gray-300 text-xs py-3">Tiada item dipilih</div>}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">Jumlah</span>
              <span className="text-gray-900 text-xl font-black">RM {total.toFixed(2)}</span>
            </div>
            {!orderSent ? (
              <button onClick={sendOrder} disabled={cartItems.length === 0 || saving} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-30 transition-all">
                {saving ? "Menghantar..." : "Hantar ke Dapur 🍳"}
              </button>
            ) : (
              <button onClick={() => setShowCheckout(true)} disabled={saving} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-sm transition-all">
                Checkout & Bayar 💳
              </button>
            )}
          </div>
        </>
      )}

      {/* REKOD TAB */}
      {activeTab === "rekod" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className="text-gray-900 font-bold text-lg">Rekod Order</h2>
            <p className="text-gray-400 text-xs mt-1">50 order terkini</p>
          </div>
          {loadingRekod ? (
            <div className="text-center text-gray-400 py-10">Loading...</div>
          ) : rekod.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-gray-400 text-sm">Tiada rekod lagi</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rekod.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-gray-900 font-black text-sm">{order.order_number || "ORD-LAMA"}</div>
                      <div className="text-gray-400 text-xs mt-0.5">Meja {order.meja} · {new Date(order.created_at).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900 font-black">RM {Number(order.total).toFixed(2)}</div>
                      <div className={`text-xs font-bold mt-0.5 ${order.status === "paid" ? "text-green-600" : order.status === "done" ? "text-blue-600" : "text-amber-500"}`}>
                        {order.status === "paid" ? "✓ Dibayar" : order.status === "done" ? "Siap" : "Dalam proses"}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-500 py-0.5">
                        <span>{item.nama} ×{item.qty}</span>
                        <span>RM {(item.harga * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"></div>
            <h3 className="text-gray-900 font-bold text-lg mb-2">Bayaran</h3>
            <p className="text-gray-400 text-sm mb-4">Meja {currentMeja} · {cartItems.length} produk</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">{item.nama} ×{item.qty}</span>
                  <span className="text-gray-900 font-bold">RM {(item.harga_jual * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-3 mt-2 border-t border-gray-200">
                <span className="text-gray-900 font-black">Jumlah</span>
                <span className="text-gray-900 font-black text-lg">RM {total.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={completePayment} disabled={saving} className="bg-green-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50">{saving ? "..." : "💵 Tunai"}</button>
              <button onClick={completePayment} disabled={saving} className="bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50">{saving ? "..." : "📱 DuitNow"}</button>
            </div>
            <button onClick={() => setShowCheckout(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm text-center">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"></div>
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-gray-900 font-bold text-xl">Bayaran Berjaya!</h3>
            <div className="text-green-600 text-3xl font-black my-4">RM {lastTotal.toFixed(2)}</div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left">
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Stok dikemaskini</span><span className="text-green-600">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>COGS direkod</span><span className="text-green-600">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Laporan dikemaskini</span><span className="text-green-600">✓</span></div>
            </div>
            <button onClick={() => { setShowSuccess(false); clearCart(); }} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-sm mb-3">Jualan Baru</button>
            <button className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-sm">📱 Resit WhatsApp</button>
          </div>
        </div>
      )}

      {/* Tukar Password Modal */}
      {showTukarPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-6">🔑 Tukar Password</h3>
            <div className="mb-3">
              <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD SEMASA</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="mb-3">
              <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD BARU</label>
              <input type="password" value={newPasswordStaff} onChange={(e) => setNewPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
              <input type="password" value={confirmPasswordStaff} onChange={(e) => setConfirmPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-green-500" />
            </div>
            {passwordMsgStaff && (
              <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsgStaff.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{passwordMsgStaff}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowTukarPassword(false); setOldPassword(""); setNewPasswordStaff(""); setConfirmPasswordStaff(""); setPasswordMsgStaff(""); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={tukarPasswordStaff} disabled={!oldPassword || !newPasswordStaff || !confirmPasswordStaff} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">Tukar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}