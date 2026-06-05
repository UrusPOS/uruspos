"use client";

import { useEffect, useState, type TouchEvent } from "react";
import { supabase } from "@/lib/supabase";

type Produk = {
  id: string;
  nama: string;
  harga_jual: number;
  kos_produk: number;
  stok: number;
};

type CartItem = Produk & { qty: number; nota: string };

export default function StaffDashboardPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [currentMeja, setCurrentMeja] = useState("Meja 1");
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
  const [showMenu, setShowMenu] = useState(false);
  const [rekod, setRekod] = useState<any[]>([]);
  const [loadingRekod, setLoadingRekod] = useState(false);
  const [showTukarPassword, setShowTukarPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPasswordStaff, setNewPasswordStaff] = useState("");
  const [confirmPasswordStaff, setConfirmPasswordStaff] = useState("");
  const [passwordMsgStaff, setPasswordMsgStaff] = useState("");

  const [tableCount, setTableCount] = useState(6);
  const [productSearch, setProductSearch] = useState("");
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [orderPanelTouchStartY, setOrderPanelTouchStartY] = useState<number | null>(null);
  const [loadingTableOrder, setLoadingTableOrder] = useState(false);

  const [paymentMode, setPaymentMode] = useState<null | "tunai" | "duitnow">(null);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [lastPaymentMethod, setLastPaymentMethod] = useState("");
  const [lastCashReceived, setLastCashReceived] = useState(0);
  const [lastCashChange, setLastCashChange] = useState(0);
  const [duitNowQrUrl] = useState("");

  const normalizedTableCount = Math.min(20, Math.max(1, Number(tableCount) || 6));
  const mejaList = [
    ...Array.from({ length: normalizedTableCount }, (_, index) => `Meja ${index + 1}`),
    "Bungkus",
  ];

  const filteredProduk = produk.filter((item) =>
    item.nama.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

  function clearProductSearch() {
    setProductSearch("");
  }

  function handleOrderPanelTouchStart(e: TouchEvent<HTMLDivElement>) {
    setOrderPanelTouchStartY(e.touches[0].clientY);
  }

  function handleOrderPanelTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (orderPanelTouchStartY === null) return;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - orderPanelTouchStartY;

    if (diff > 45) setIsOrderPanelOpen(false);
    if (diff < -45) setIsOrderPanelOpen(true);

    setOrderPanelTouchStartY(null);
  }

  function displayMejaLabel(meja?: string | null) {
    if (!meja) return "-";
    if (meja === "Bungkus") return "Bungkus";
    if (meja.startsWith("Meja")) return meja;
    if (meja.startsWith("T")) return `Meja ${meja.replace("T", "")}`;
    return meja;
  }


  function buildCartFromOrder(order: any, produkSource: Produk[] = produk) {
    const restoredCart: { [id: string]: CartItem } = {};

    (order?.order_items || []).forEach((item: any) => {
      const produkId = item.produk_id || item.product_id || item.id;
      const productInfo = produkSource.find((p) => p.id === produkId);

      restoredCart[produkId] = {
        id: produkId,
        nama: item.nama || productInfo?.nama || "Produk",
        harga_jual: Number(item.harga ?? productInfo?.harga_jual ?? 0),
        kos_produk: Number(item.kos ?? productInfo?.kos_produk ?? 0),
        stok: Number(productInfo?.stok ?? 999),
        qty: Number(item.qty || 0),
        nota: item.nota || "",
      };
    });

    return restoredCart;
  }

  async function loadOpenOrderForMeja(meja: string, kId: string | null = kedaiId, produkSource: Produk[] = produk) {
    if (!kId) {
      setCart({});
      setCurrentOrderId(null);
      setOrderSent(false);
      return;
    }

    setLoadingTableOrder(true);

    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("kedai_id", kId)
      .eq("meja", meja)
      .in("status", ["pending", "preparing", "ready", "done"])
      .order("created_at", { ascending: false })
      .limit(1) as any;

    const openOrder = data?.[0];

    if (openOrder) {
      setCurrentOrderId(openOrder.id);
      setOrderSent(true);
      setCart(buildCartFromOrder(openOrder, produkSource));
    } else {
      setCurrentOrderId(null);
      setOrderSent(false);
      setCart({});
    }

    setLoadingTableOrder(false);
  }

  async function handleChangeMeja(nextMeja: string) {
    if (nextMeja === currentMeja) return;

    if (cartItems.length > 0 && !orderSent) {
      const confirmChange = window.confirm("Pesanan belum dihantar ke dapur. Tukar meja akan kosongkan pesanan ini. Teruskan?");
      if (!confirmChange) return;
    }

    setCurrentMeja(nextMeja);
    setCart({});
    setCurrentOrderId(null);
    setOrderSent(false);
    await loadOpenOrderForMeja(nextMeja);
  }

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

    const { data: kedaiData } = await supabase
      .from("kedai")
      .select("table_count")
      .eq("id", kId)
      .single() as any;

    const savedTableCount = Math.min(20, Math.max(1, Number(kedaiData?.table_count) || 6));
    setTableCount(savedTableCount);

    let resolvedMeja = currentMeja;
    if (resolvedMeja !== "Bungkus") {
      const tableNumber = Number(resolvedMeja.replace("Meja ", "").replace("T", ""));
      resolvedMeja = tableNumber >= 1 && tableNumber <= savedTableCount ? `Meja ${tableNumber}` : "Meja 1";
    }
    setCurrentMeja(resolvedMeja);

    const { data } = await supabase.from("produk").select("*").eq("is_active", true).eq("kedai_id", kId).order("nama");
    const produkList = data || [];
    setProduk(produkList);
    await loadOpenOrderForMeja(resolvedMeja, kId, produkList);
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
    const query = supabase.from("orders").select("*, order_items(*)").in("status", ["paid", "done"]).order("created_at", { ascending: false }).limit(50);
    if (kId) query.eq("kedai_id", kId);
    const { data } = await query as any;
    setRekod(data || []);
    setLoadingRekod(false);
  }

  function addToCart(item: Produk) {
    if (item.stok === 0) return;
    if (orderSent) setOrderSent(false);
    setIsOrderPanelOpen(true);
    setCart((prev) => ({ ...prev, [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1, nota: prev[item.id]?.nota || "" } }));
  }

  function updateQty(id: string, delta: number) {
    if (orderSent) setOrderSent(false);
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) { const updated = { ...prev }; delete updated[id]; return updated; }
      return { ...prev, [id]: { ...current, qty: newQty } };
    });
  }


  function updateNota(id: string, nota: string) {
    if (orderSent) setOrderSent(false);
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, nota } };
    });
  }

  function clearCart() { setCart({}); setOrderSent(false); setCurrentOrderId(null); }

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, i) => s + i.harga_jual * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cashReceivedNumber = Number(cashReceived || 0);
  const cashBalance = cashReceivedNumber - total;

  async function sendOrder() {
    if (cartItems.length === 0 || !kedaiId) return;
    setSaving(true);

    let orderId = currentOrderId;

    if (!orderId) {
      const { data: order } = await supabase
        .from("orders")
        .insert({ meja: currentMeja, status: "pending", total, kedai_id: kedaiId })
        .select()
        .single() as any;

      if (!order) {
        setSaving(false);
        return;
      }

      orderId = order.id;
    } else {
      await supabase.from("order_items").delete().eq("order_id", orderId);
    }

    const items = cartItems.map((item) => ({
      order_id: orderId,
      produk_id: item.id,
      nama: item.nama,
      qty: item.qty,
      harga: item.harga_jual,
      kos: item.kos_produk,
      nota: item.nota || "",
    }));

    await supabase.from("order_items").insert(items);
    await supabase.from("orders").update({ meja: currentMeja, status: "preparing", total } as any).eq("id", orderId);

    setCurrentOrderId(orderId);
    setOrderSent(true);
    setSaving(false);
  }

  function resetPaymentState() {
    setPaymentMode(null);
    setCashReceived("");
    setPaymentError("");
  }

  function openCheckout() {
    resetPaymentState();
    setShowCheckout(true);
  }

  function closeCheckout() {
    if (saving) return;
    setShowCheckout(false);
    resetPaymentState();
  }

  function selectPaymentMode(mode: "tunai" | "duitnow") {
    setPaymentMode(mode);
    setPaymentError("");
    if (mode === "tunai") setCashReceived("");
  }

  function setExactCashAmount() {
    setCashReceived(total.toFixed(2));
    setPaymentError("");
  }

  function appendCashInput(value: string) {
    setPaymentError("");
    setCashReceived((prev) => {
      if (value === "clear") return "";
      if (value === "backspace") return prev.slice(0, -1);
      if (value === "." && prev.includes(".")) return prev;
      const next = `${prev}${value}`;
      const parts = next.split(".");
      if (parts[1]?.length > 2) return prev;
      if (next.length > 10) return prev;
      return next;
    });
  }

  async function updateOrderAsPaid(paymentMethod: "tunai" | "duitnow", cashInfo?: { received: number; change: number }) {
    if (!currentOrderId) return false;

    const fullPayload: any = {
      status: "paid",
      payment_method: paymentMethod,
      cash_received: cashInfo?.received ?? null,
      cash_change: cashInfo?.change ?? null,
    };

    const { error: fullError } = await supabase.from("orders").update(fullPayload).eq("id", currentOrderId);
    if (!fullError) return true;

    const { error: methodError } = await supabase
      .from("orders")
      .update({ status: "paid", payment_method: paymentMethod } as any)
      .eq("id", currentOrderId);
    if (!methodError) return true;

    const { error: fallbackError } = await supabase.from("orders").update({ status: "paid" } as any).eq("id", currentOrderId);
    return !fallbackError;
  }

  async function completePayment(paymentMethod: "tunai" | "duitnow") {
    if (!currentOrderId) return;

    const received = Number(cashReceived || 0);
    const change = paymentMethod === "tunai" ? received - total : 0;

    if (paymentMethod === "tunai" && (!cashReceived || received < total)) {
      setPaymentError("Jumlah tunai diterima tidak mencukupi.");
      return;
    }

    setSaving(true);
    setPaymentError("");

    const paymentUpdated = await updateOrderAsPaid(
      paymentMethod,
      paymentMethod === "tunai" ? { received, change } : undefined
    );

    if (!paymentUpdated) {
      setSaving(false);
      setPaymentError("Gagal sahkan bayaran. Cuba sekali lagi.");
      return;
    }

    for (const item of cartItems) {
      const produkItem = produk.find((p) => p.id === item.id);
      if (produkItem) {
        const newStok = Math.max(0, produkItem.stok - item.qty);
        await supabase.from("produk").update({ stok: newStok } as any).eq("id", item.id);
      }
    }

    setLastTotal(total);
    setLastPaymentMethod(paymentMethod === "tunai" ? "Tunai" : "DuitNow");
    setLastCashReceived(paymentMethod === "tunai" ? received : 0);
    setLastCashChange(paymentMethod === "tunai" ? change : 0);
    setCart({});
    setCurrentOrderId(null);
    setOrderSent(false);
    setShowCheckout(false);
    resetPaymentState();
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


  const navItems = [
    { id: "pos", label: "Sistem POS", icon: "🛒", description: "Ambil order & hantar dapur" },
    { id: "rekod", label: "Rekod Jualan", icon: "📋", description: "Semak order terkini" },
    { id: "settings", label: "Tetapan", icon: "🔑", description: "Ubah password akaun" },
  ];

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    setShowMenu(false);
    if (tabId === "rekod") fetchRekod();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowMenu(true)}
            className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 font-black text-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
            aria-label="Buka menu"
          >
            ☰
          </button>
          <div className="min-w-0">
            <span className="text-gray-900 font-bold text-lg leading-none block">Urus<span className="text-green-600">POS</span></span>
            <div className="text-gray-400 text-xs font-bold mt-1 truncate">{activeNav.label}</div>
          </div>
        </div>
        <a href="/auth/logout" className="bg-gray-50 border border-gray-200 text-gray-500 text-xs font-bold px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all">Log Keluar</a>
      </div>

      {/* Drawer Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50">
          <button
            onClick={() => setShowMenu(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Tutup menu"
          />
          <div className="relative h-full w-[84%] max-w-sm bg-white shadow-2xl p-5 flex flex-col animate-[slideInLeft_0.22s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-gray-900 font-black text-xl leading-none">Urus<span className="text-green-600">POS</span></div>
                <div className="text-green-600 text-xs font-black mt-1 uppercase tracking-wide">Staff Menu</div>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-500 font-black active:scale-95 transition-all"
                aria-label="Tutup menu"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-950 to-gray-800 rounded-3xl p-5 mb-5 text-white shadow-lg">
              <div className="text-gray-400 text-xs font-bold mb-1">SEDANG DIBUKA</div>
              <div className="font-black text-lg leading-tight truncate">{activeNav.label}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-white/10 text-white text-xs font-black px-3 py-1 rounded-full">👤 {staffNama || "Staff"}</span>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => changeTab(item.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all border ${isActive ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20" : "bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100"}`}
                  >
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isActive ? "bg-white/20" : "bg-white border border-gray-100"}`}>{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-sm">{item.label}</span>
                      <span className={`block text-xs font-semibold mt-0.5 ${isActive ? "text-gray-200" : "text-gray-400"}`}>{item.description}</span>
                    </span>
                    {isActive && <span className="font-black">✓</span>}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* POS TAB */}
      {activeTab === "pos" && (
        <>
          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="sticky top-0 z-10 bg-gray-50 pb-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="text-gray-500 text-[11px] font-black uppercase tracking-wide">Cari Produk</label>
                {!loading && produk.length > 0 && (
                  <div className="text-gray-400 text-[11px] font-bold text-right whitespace-nowrap">
                    {productSearch.trim() ? `${filteredProduk.length}/${produk.length} dijumpai` : `${produk.length} produk tersedia`}
                  </div>
                )}
              </div>
              <div className="relative">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Nama produk"
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl pl-11 pr-11 py-3.5 text-sm font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-sm"
                />
                {productSearch && (
                  <button
                    onClick={clearProductSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gray-100 text-gray-500 font-black flex items-center justify-center active:scale-95 transition-all"
                    aria-label="Kosongkan carian"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-10">Loading menu...</div>
            ) : produk.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🍽️</div>
                <div className="text-gray-400 text-sm">Tiada produk lagi</div>
                <div className="text-gray-300 text-xs mt-1">Owner perlu tambah produk dulu</div>
              </div>
            ) : filteredProduk.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm mt-2">
                <div className="text-4xl mb-3">🔎</div>
                <div className="text-gray-900 text-sm font-black">Produk tak dijumpai</div>
                <div className="text-gray-400 text-xs mt-1">Cuba cari nama menu lain.</div>
                <button onClick={clearProductSearch} className="mt-4 bg-gray-900 text-white text-xs font-black px-4 py-2.5 rounded-2xl active:scale-95 transition-all">Reset Carian</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredProduk.map((item) => (
                  <button key={item.id} onClick={() => addToCart(item)} disabled={item.stok === 0}
                    className={`bg-white rounded-2xl p-3 text-center border-2 transition-all shadow-sm relative ${cart[item.id]?.qty > 0 ? "border-green-500 bg-green-50" : "border-gray-100"} ${item.stok === 0 ? "opacity-40" : "active:scale-95"}`}
                  >
                    {cart[item.id]?.qty > 0 && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-black min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm border border-white">
                        {cart[item.id].qty}
                      </div>
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
          <div
            className="bg-white border-t border-gray-200 flex-shrink-0 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] transition-all duration-300"
            onTouchStart={handleOrderPanelTouchStart}
            onTouchEnd={handleOrderPanelTouchEnd}
          >
            <button
              onClick={() => setIsOrderPanelOpen((prev) => !prev)}
              className="relative w-full px-4 pt-4 pb-3 flex items-center gap-3 text-left active:bg-gray-50 transition-all"
              aria-label={isOrderPanelOpen ? "Sembunyikan panel pesanan" : "Buka panel pesanan"}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-800">
                {isOrderPanelOpen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 15L12 9L18 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-black text-sm">Pesanan</span>
                  {cartCount > 0 && (
                    <span className="bg-green-100 text-green-700 text-[11px] font-black px-2 py-0.5 rounded-full">{cartCount} item</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs font-bold mt-0.5 truncate">
                  {loadingTableOrder ? "Menyemak order aktif..." : displayMejaLabel(currentMeja)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-gray-900 text-lg font-black">RM {total.toFixed(2)}</div>
                <div className="text-gray-400 text-[11px] font-bold">Jumlah</div>
              </div>
            </button>

            {isOrderPanelOpen && (
              <div className="px-4 pb-4 animate-[orderPanelUp_0.22s_ease-out]">
                {cartCount > 0 && !orderSent && (
                  <div className="flex justify-end mb-3">
                    <button onClick={clearCart} className="text-red-500 text-xs font-black bg-red-50 px-3 py-2 rounded-xl border border-red-100 active:scale-95 transition-all">
                      Kosongkan
                    </button>
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-gray-500 text-[11px] font-black mb-2 block uppercase tracking-wide">Jenis Pesanan</label>
                  <div className="relative">
                    <select
                      value={currentMeja}
                      onChange={(e) => handleChangeMeja(e.target.value)}
                      disabled={loadingTableOrder}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl px-4 py-3.5 pr-10 text-sm font-black outline-none focus:border-green-500 focus:bg-white transition-all disabled:opacity-60"
                    >
                      {mejaList.map((meja) => (
                        <option key={meja} value={meja}>{displayMejaLabel(meja)}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                  </div>
                  {orderSent && currentOrderId && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-2xl px-3 py-2">
                      Order meja ini sudah dihantar ke dapur dan belum dibayar.
                    </div>
                  )}
                </div>

                {cartItems.length > 0 ? (
                  <div className="flex flex-col gap-3 mb-4 max-h-64 overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-gray-900 text-sm font-black truncate">{item.nama}</div>
                            <div className="text-gray-400 text-xs font-bold mt-0.5">RM {item.harga_jual.toFixed(2)} × {item.qty}</div>
                          </div>
                          <div className="text-gray-900 text-sm font-black whitespace-nowrap">RM {(item.harga_jual * item.qty).toFixed(2)}</div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 text-lg font-black flex items-center justify-center active:scale-95 transition-all">−</button>
                            <span className="min-w-8 text-center text-gray-900 text-sm font-black">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 text-lg font-black flex items-center justify-center active:scale-95 transition-all">+</button>
                          </div>
                          <span className="bg-white border border-gray-200 text-gray-500 text-xs font-bold px-3 py-2 rounded-xl">{item.qty} item</span>
                        </div>

                        <div className="mt-3">
                          <label className="text-gray-400 text-[11px] font-black mb-1.5 block uppercase tracking-wide">Nota item</label>
                          <input
                            type="text"
                            value={item.nota}
                            onChange={(e) => updateNota(item.id, e.target.value)}
                            placeholder="cth: tak pedas, kurang ais, asing kuah"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-green-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-5 mb-4 text-center">
                    <div className="text-3xl mb-2">🛒</div>
                    <div className="text-gray-900 text-sm font-black">Belum ada item</div>
                    <div className="text-gray-400 text-xs mt-1">Pilih menu di atas untuk mula order</div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-2xl px-4 py-3">
                  <span className="text-gray-500 text-sm font-bold">Jumlah</span>
                  <span className="text-gray-900 text-2xl font-black">RM {total.toFixed(2)}</span>
                </div>

                {!orderSent ? (
                  <button onClick={sendOrder} disabled={cartItems.length === 0 || saving} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-sm disabled:opacity-30 active:scale-95 transition-all">
                    {saving ? "Menghantar..." : cartItems.length === 0 ? "Hantar ke Dapur" : currentOrderId ? `Update Pesanan • RM ${total.toFixed(2)} 🍳` : `Hantar ke Dapur • RM ${total.toFixed(2)} 🍳`}
                  </button>
                ) : (
                  <button onClick={openCheckout} disabled={saving} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-sm active:scale-95 transition-all">
                    Checkout & Bayar • RM {total.toFixed(2)} 💳
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* REKOD TAB */}
      {activeTab === "rekod" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className="text-gray-900 font-bold text-lg">Rekod Order</h2>
            <p className="text-gray-400 text-xs mt-1">50 jualan berbayar terkini</p>
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
                      <div className="text-gray-400 text-xs mt-0.5">{displayMejaLabel(order.meja)} · {new Date(order.created_at).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}</div>
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

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className="text-gray-900 font-bold text-lg">Tetapan</h2>
            <p className="text-gray-400 text-xs mt-1">Ubah password akaun staff</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-gray-900 font-bold text-sm mb-4">🔑 Tukar Password</h3>
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
            <button
              onClick={tukarPasswordStaff}
              disabled={!oldPassword || !newPasswordStaff || !confirmPasswordStaff}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              Tukar Password
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"></div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-gray-900 font-black text-lg">Bayaran</h3>
                <p className="text-gray-400 text-sm mt-1">{displayMejaLabel(currentMeja)} · {cartItems.length} produk</p>
              </div>
              {paymentMode && (
                <button onClick={() => selectPaymentMode(paymentMode === "tunai" ? "duitnow" : "tunai")} className="bg-gray-100 text-gray-600 text-xs font-black px-3 py-2 rounded-2xl active:scale-95 transition-all">
                  Tukar
                </button>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm py-1">
                  <span className="text-gray-500 flex-1">{item.nama} ×{item.qty}{item.nota ? ` — ${item.nota}` : ""}</span>
                  <span className="text-gray-900 font-bold whitespace-nowrap">RM {(item.harga_jual * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-3 mt-2 border-t border-gray-200">
                <span className="text-gray-900 font-black">Jumlah</span>
                <span className="text-gray-900 font-black text-lg">RM {total.toFixed(2)}</span>
              </div>
            </div>

            {!paymentMode && (
              <>
                <div className="text-gray-500 text-xs font-black uppercase tracking-wide mb-2">Pilih Kaedah Bayaran</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={() => selectPaymentMode("tunai")} disabled={saving} className="bg-green-600 text-white font-black py-4 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all">
                    <div className="text-2xl mb-1">💵</div>
                    Tunai
                  </button>
                  <button onClick={() => selectPaymentMode("duitnow")} disabled={saving} className="bg-blue-600 text-white font-black py-4 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all">
                    <div className="text-2xl mb-1">📱</div>
                    DuitNow
                  </button>
                </div>
              </>
            )}

            {paymentMode === "tunai" && (
              <div className="mb-3">
                <div className="bg-green-50 border border-green-100 rounded-3xl p-4 mb-3">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="text-green-700 text-xs font-black uppercase tracking-wide">Tunai Diterima</div>
                      <div className="text-gray-900 text-3xl font-black mt-1">RM {cashReceivedNumber.toFixed(2)}</div>
                    </div>
                    <button onClick={setExactCashAmount} className="bg-white border border-green-200 text-green-700 text-xs font-black px-3 py-2 rounded-2xl active:scale-95 transition-all">Exact</button>
                  </div>

                  <div className={`rounded-2xl p-3 ${cashReceived ? cashBalance >= 0 ? "bg-white border border-green-200" : "bg-red-50 border border-red-100" : "bg-white border border-gray-100"}`}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-500">Baki perlu diberi</span>
                      <span className={cashReceived && cashBalance < 0 ? "text-red-600" : "text-green-700"}>
                        {cashReceived ? cashBalance >= 0 ? `RM ${cashBalance.toFixed(2)}` : `Kurang RM ${Math.abs(cashBalance).toFixed(2)}` : "RM 0.00"}
                      </span>
                    </div>
                    <div className="text-gray-400 text-[11px]">Staff perlu semak tunai diterima sebelum sahkan bayaran.</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
                    <button
                      key={key}
                      onClick={() => appendCashInput(key)}
                      className="bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-4 text-lg font-black active:scale-95 active:bg-gray-100 transition-all"
                    >
                      {key === "backspace" ? "⌫" : key}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[5, 10, 20, 50].map((value) => (
                    <button key={value} onClick={() => setCashReceived(String((Number(cashReceived || 0) + value).toFixed(2)))} className="bg-white border border-gray-200 text-gray-700 rounded-2xl py-2.5 text-xs font-black active:scale-95 transition-all">+RM {value}</button>
                  ))}
                </div>

                <button onClick={() => appendCashInput("clear")} className="w-full bg-gray-100 text-gray-600 font-black py-3 rounded-2xl text-sm mb-3 active:scale-95 transition-all">Clear</button>

                {paymentError && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl p-3 mb-3">⚠️ {paymentError}</div>}

                <button onClick={() => completePayment("tunai")} disabled={saving || !cashReceived || cashBalance < 0} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all">
                  {saving ? "Mengesahkan..." : `Sahkan Tunai Diterima • Baki RM ${Math.max(0, cashBalance).toFixed(2)}`}
                </button>
              </div>
            )}

            {paymentMode === "duitnow" && (
              <div className="mb-3">
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 mb-4 text-center">
                  <div className="text-blue-700 text-xs font-black uppercase tracking-wide mb-3">DuitNow QR</div>
                  {duitNowQrUrl ? (
                    <img src={duitNowQrUrl} alt="DuitNow QR" className="w-52 h-52 object-contain rounded-3xl bg-white border border-blue-100 mx-auto" />
                  ) : (
                    <div className="w-52 h-52 rounded-3xl bg-white border-2 border-dashed border-blue-200 mx-auto flex flex-col items-center justify-center p-4">
                      <div className="text-5xl mb-3">📱</div>
                      <div className="text-gray-900 text-sm font-black">QR DuitNow belum diset</div>
                      <div className="text-gray-400 text-xs mt-1 leading-relaxed">Nanti QR owner akan dipaparkan di sini selepas setup upload QR dibuat.</div>
                    </div>
                  )}
                  <div className="text-gray-900 text-3xl font-black mt-4">RM {total.toFixed(2)}</div>
                  <div className="text-blue-600 text-xs font-bold mt-1">Minta customer scan dan bayar jumlah ini.</div>
                </div>

                {paymentError && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl p-3 mb-3">⚠️ {paymentError}</div>}

                <button onClick={() => completePayment("duitnow")} disabled={saving} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all">
                  {saving ? "Mengesahkan..." : "Sahkan DuitNow Diterima"}
                </button>
              </div>
            )}

            <button onClick={paymentMode ? () => setPaymentMode(null) : closeCheckout} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-sm active:scale-95 transition-all">
              {paymentMode ? "Kembali" : "Batal"}
            </button>
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
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Kaedah bayaran</span><span className="text-gray-900 font-bold">{lastPaymentMethod || "-"}</span></div>
              {lastPaymentMethod === "Tunai" && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Tunai diterima</span><span className="text-gray-900 font-bold">RM {lastCashReceived.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Baki diberi</span><span className="text-green-600 font-bold">RM {lastCashChange.toFixed(2)}</span></div>
                </>
              )}
              <div className="border-t border-gray-200 my-2"></div>
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

      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes orderPanelUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
}