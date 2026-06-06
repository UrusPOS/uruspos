"use client";

import { useEffect, useState, type CSSProperties, type TouchEvent } from "react";
import { supabase } from "@/lib/supabase";

type Produk = {
  id: string;
  nama: string;
  harga_jual: number;
  kos_produk: number;
  stok: number;
};

type CartItem = Produk & { qty: number; nota: string };

type RekodFilterType = "daily" | "yesterday" | "weekly" | "monthly" | "custom";

type ReceiptItem = {
  id?: string;
  nama: string;
  qty: number;
  harga: number;
  nota?: string | null;
};

type RecentReceipt = {
  id: string;
  created_at: string;
  meja: string | null;
  status: string;
  total: number;
  payment_method?: string | null;
  order_items: ReceiptItem[];
};

export default function StaffDashboardPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<{ [id: string]: CartItem }>({});
  const [currentMeja, setCurrentMeja] = useState("Meja 1");
  const [kedaiId, setKedaiId] = useState<string | null>(null);
  const [staffNama, setStaffNama] = useState("Staff");
  const [kedaiInfo, setKedaiInfo] = useState<{ nama: string; logo_url?: string | null; accent_color?: string | null } | null>(null);
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
  const [rekodFilter, setRekodFilter] = useState<RekodFilterType>("daily");
  const [rekodCustomFrom, setRekodCustomFrom] = useState("");
  const [rekodCustomTo, setRekodCustomTo] = useState("");
  const [showRekodDropdown, setShowRekodDropdown] = useState(false);
  const [showRekodFilterModal, setShowRekodFilterModal] = useState(false);
  const [pendingRekodFilter, setPendingRekodFilter] = useState<RekodFilterType>("daily");
  const [pendingRekodCustomFrom, setPendingRekodCustomFrom] = useState("");
  const [pendingRekodCustomTo, setPendingRekodCustomTo] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<RecentReceipt | null>(null);
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
  const [duitNowQrUrl, setDuitNowQrUrl] = useState("");

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

  function getRekodDateRange(filterType: RekodFilterType, customFrom?: string, customTo?: string) {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    if (filterType === "daily") {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }

    if (filterType === "yesterday") {
      const from = new Date(now);
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const yesterdayTo = new Date(from);
      yesterdayTo.setHours(23, 59, 59, 999);
      return { from: from.toISOString(), to: yesterdayTo.toISOString() };
    }

    if (filterType === "weekly") {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }

    if (filterType === "monthly") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      return { from: from.toISOString(), to: to.toISOString() };
    }

    if (filterType === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const customEnd = new Date(customTo);
      customEnd.setHours(23, 59, 59, 999);
      return { from: from.toISOString(), to: customEnd.toISOString() };
    }

    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function rekodFilterLabel() {
    if (rekodFilter === "daily") return "Hari Ini";
    if (rekodFilter === "yesterday") return "Semalam";
    if (rekodFilter === "weekly") return "7 Hari Lepas";
    if (rekodFilter === "monthly") return "Bulan Ini";
    if (rekodFilter === "custom" && rekodCustomFrom && rekodCustomTo) {
      return `${formatShortDate(rekodCustomFrom)} — ${formatShortDate(rekodCustomTo)}`;
    }
    return "Tarikh Custom";
  }

  function rekodPendingFilterLabel(value: RekodFilterType) {
    if (value === "daily") return "Hari Ini";
    if (value === "yesterday") return "Semalam";
    if (value === "weekly") return "7 Hari Lepas";
    if (value === "monthly") return "Bulan Ini";
    return "Tarikh Custom";
  }

  function openRekodFilterModal() {
    setShowRekodDropdown((prev) => !prev);
  }

  function applyRekodDropdownFilter(nextFilter: RekodFilterType) {
    setShowRekodDropdown(false);

    if (nextFilter === "custom") {
      setPendingRekodFilter("custom");
      setPendingRekodCustomFrom(rekodCustomFrom);
      setPendingRekodCustomTo(rekodCustomTo);
      setShowRekodFilterModal(true);
      return;
    }

    setPendingRekodFilter(nextFilter);
    setRekodFilter(nextFilter);
  }

  function applyRekodFilterModal() {
    if (!pendingRekodCustomFrom || !pendingRekodCustomTo) return;

    setRekodCustomFrom(pendingRekodCustomFrom);
    setRekodCustomTo(pendingRekodCustomTo);
    setRekodFilter("custom");
    setShowRekodFilterModal(false);
  }

  function formatShortDate(dateValue: string) {
    if (!dateValue) return "";
    return new Date(dateValue).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatReceiptDate(dateValue?: string | null) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatRM(value: number) {
    return `RM ${Number(value || 0).toFixed(2)}`;
  }

  function getOrderTotal(order: any) {
    const possibleTotals = [order?.total, order?.jumlah, order?.jumlah_bayaran, order?.grand_total, order?.total_amount, order?.amount, order?.subtotal];
    for (const value of possibleTotals) {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue) && numberValue > 0) return numberValue;
    }
    return (order?.order_items || []).reduce((sum: number, item: any) => {
      const qty = Number(item?.qty || item?.quantity || 0);
      const harga = Number(item?.harga || item?.harga_jual || item?.price || item?.unit_price || 0);
      return sum + qty * harga;
    }, 0);
  }

  function getPaymentMethod(order: any) {
    return order?.payment_method || order?.paymentMethod || order?.payment || order?.bayaran || order?.kaedah_bayaran || order?.method || null;
  }

  function getOrderSalesDate(order: any) {
    return order?.paid_at || order?.paidAt || order?.completed_at || order?.completedAt || order?.updated_at || order?.updatedAt || order?.created_at || order?.createdAt || null;
  }

  function isOrderInRekodDateRange(order: any, from: string, to: string) {
    const rawDate = getOrderSalesDate(order);
    if (!rawDate) return true;
    const time = new Date(rawDate).getTime();
    if (Number.isNaN(time)) return true;
    return time >= new Date(from).getTime() && time <= new Date(to).getTime();
  }

  function toRecentReceipt(order: any): RecentReceipt {
    return {
      id: order.id,
      created_at: getOrderSalesDate(order) || order.created_at,
      meja: order.meja || order.table_no || order.tableNo || null,
      status: order.status,
      total: getOrderTotal(order),
      payment_method: getPaymentMethod(order),
      order_items: (order.order_items || []).map((item: any) => ({
        id: item.id,
        nama: item.nama || item.product_name || item.nama_produk || "Produk",
        qty: Number(item.qty || item.quantity || 0),
        harga: Number(item.harga || item.harga_jual || item.price || item.unit_price || 0),
        nota: item.nota || item.note || null,
      })),
    };
  }

  function downloadReceipt(order: any) {
    const receipt = toRecentReceipt(order);
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
        const line = `${item.nama} x${item.qty} @ ${formatRM(item.harga)} = ${formatRM(item.qty * item.harga)}`;
        return item.nota ? [line, `Nota: ${item.nota}`] : [line];
      }),
      "",
      `TOTAL: ${formatRM(receipt.total)}`,
      "",
      "Terima kasih.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${receiptNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  useEffect(() => {
    if (activeTab === "rekod") fetchRekod();
  }, [activeTab, rekodFilter, rekodCustomFrom, rekodCustomTo]);

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
      .select("nama, table_count, duitnow_qr_url, logo_url, accent_color")
      .eq("id", kId)
      .single() as any;

    const savedTableCount = Math.min(20, Math.max(1, Number(kedaiData?.table_count) || 6));
    setTableCount(savedTableCount);
    setDuitNowQrUrl(kedaiData?.duitnow_qr_url || "");
    setKedaiInfo({
      nama: kedaiData?.nama || "Kedai Saya",
      logo_url: kedaiData?.logo_url || null,
      accent_color: kedaiData?.accent_color || "green",
    });

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
    let kId = kedaiId;
    if (!kId && sessionValue) {
      const session = JSON.parse(decodeURIComponent(sessionValue));
      kId = session.kedai_id;
    }

    const { from, to } = getRekodDateRange(rekodFilter, rekodCustomFrom, rekodCustomTo);

    const query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("status", ["paid", "done", "completed", "complete", "selesai", "closed", "settled"])
      .order("created_at", { ascending: false })
      .limit(300);

    if (kId) query.eq("kedai_id", kId);

    const { data, error } = await query as any;
    if (error) {
      console.error("Fetch rekod jualan error:", error);
      setRekod([]);
      setLoadingRekod(false);
      return;
    }

    const filtered = (data || []).filter((order: any) => isOrderInRekodDateRange(order, from, to));
    setRekod(filtered);
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

  function clearCart() {
    setCart({});
    setOrderSent(false);
    setCurrentOrderId(null);
  }

  async function cancelCurrentOrder() {
    if (!currentOrderId) {
      clearCart();
      return;
    }

    const confirmCancel = window.confirm(
      "Batalkan order meja ini? Order akan dibuang dari POS dan dapur."
    );
    if (!confirmCancel) return;

    setSaving(true);

    await supabase.from("order_items").delete().eq("order_id", currentOrderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" } as any)
      .eq("id", currentOrderId);

    if (error) {
      console.error("Cancel order error:", error);
      setSaving(false);
      alert("Gagal batalkan order. Cuba refresh dan cuba sekali lagi.");
      return;
    }

    setCart({});
    setCurrentOrderId(null);
    setOrderSent(false);
    setShowCheckout(false);
    resetPaymentState();
    setSaving(false);
  }

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

  async function recordSalesStockMovements(orderId: string) {
    if (!kedaiId || cartItems.length === 0) return;

    await supabase
      .from("stock_movements")
      .delete()
      .eq("order_id", orderId)
      .eq("source", "sales");

    const movements = cartItems
      .filter((item) => Number(item.qty || 0) > 0)
      .map((item) => ({
        kedai_id: kedaiId,
        produk_id: item.id,
        produk_nama: item.nama,
        type: "sold",
        qty: Number(item.qty || 0),
        reason: "Jualan POS",
        source: "sales",
        order_id: orderId,
        created_by: staffNama,
      }));

    if (movements.length === 0) return;

    const { error } = await supabase.from("stock_movements").insert(movements as any);
    if (error) console.warn("Sales stock movement log failed:", error);
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

    await recordSalesStockMovements(currentOrderId);

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

  const selectedAccentColor = kedaiInfo?.accent_color || "green";
  const accentTheme = accentThemeMap[selectedAccentColor] || accentThemeMap.green;
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
    "--accent-gradient-from": accentTheme.gradientFrom,
    "--accent-gradient-to": accentTheme.gradientTo,
    "--accent-text": accentTheme.textOnAccent,
  } as CSSProperties;

  const navItems = [
    { id: "pos", label: "Sistem POS", icon: "🛒", description: "Ambil order & hantar dapur" },
    { id: "rekod", label: "Rekod Jualan", icon: "📋", description: "Semak order terkini" },
    { id: "settings", label: "Tetapan", icon: "🔑", description: "Ubah password akaun" },
  ];

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    setShowMenu(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={accentStyle}>
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
            <span className="text-gray-900 font-bold text-lg leading-none block">Urus<span className="text-[var(--accent-600)]">POS</span></span>
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
                <div className="text-gray-900 font-black text-xl leading-none">Urus<span className="text-[var(--accent-600)]">POS</span></div>
                <div className="text-[var(--accent-600)] text-xs font-black mt-1 uppercase tracking-wide">Staff Menu</div>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-500 font-black active:scale-95 transition-all"
                aria-label="Tutup menu"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] rounded-3xl p-5 mb-5 text-white shadow-lg">
              <div className="flex items-center gap-3">
                {kedaiInfo?.logo_url ? (
                  <img
                    src={kedaiInfo.logo_url}
                    alt="Logo kedai"
                    className="w-14 h-14 rounded-2xl object-cover bg-white border border-white/20 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                    🏪
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-gray-400 text-xs font-bold mb-1">KEDAI</div>
                  <div className="font-black text-lg leading-tight truncate">{kedaiInfo?.nama || "Kedai Saya"}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="bg-white/10 text-white text-xs font-black px-3 py-1 rounded-full">👤 {staffNama || "Staff"}</span>
                    <span className="bg-white/10 text-white text-xs font-black px-3 py-1 rounded-full">{activeNav.label}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => changeTab(item.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all border ${isActive ? "bg-[var(--accent-600)] border-[var(--accent-600)] text-white shadow-lg" : "bg-gray-50 border-gray-100 text-gray-700 active:bg-gray-100"}`}
                  >
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${isActive ? "bg-white/20" : "bg-white border border-gray-100"}`}>{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-black text-sm">{item.label}</span>
                      <span className={`block text-xs font-semibold mt-0.5 ${isActive ? "text-[var(--accent-100)]" : "text-gray-400"}`}>{item.description}</span>
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
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-2xl pl-11 pr-11 py-3.5 text-sm font-bold outline-none focus:border-[var(--accent-500)] focus:ring-4 focus:ring-[var(--accent-100)] transition-all shadow-sm"
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
                    className={`bg-white rounded-2xl p-3 text-center border-2 transition-all shadow-sm relative ${cart[item.id]?.qty > 0 ? "border-[var(--accent-500)] bg-[var(--accent-50)]" : "border-gray-100"} ${item.stok === 0 ? "opacity-40" : "active:scale-95"}`}
                  >
                    {cart[item.id]?.qty > 0 && (
                      <div className="absolute top-2 right-2 bg-[var(--accent-600)] text-white text-[10px] font-black min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm border border-white">
                        {cart[item.id].qty}
                      </div>
                    )}
                    <div className="text-2xl mb-1">🍽️</div>
                    <div className="text-gray-900 text-xs font-bold leading-tight">{item.nama}</div>
                    <div className="text-[var(--accent-600)] text-xs font-black mt-1">RM {item.harga_jual.toFixed(2)}</div>
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
                    <span className="bg-[var(--accent-100)] text-[var(--accent-700)] text-[11px] font-black px-2 py-0.5 rounded-full">{cartCount} item</span>
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
                      className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl px-4 py-3.5 pr-10 text-sm font-black outline-none focus:border-[var(--accent-500)] focus:bg-white transition-all disabled:opacity-60"
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
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-[var(--accent-500)]"
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
                  <button onClick={sendOrder} disabled={cartItems.length === 0 || saving} className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-30 active:scale-95 transition-all">
                    {saving ? "Menghantar..." : cartItems.length === 0 ? "Hantar ke Dapur" : currentOrderId ? `Update Pesanan • RM ${total.toFixed(2)} 🍳` : `Hantar ke Dapur • RM ${total.toFixed(2)} 🍳`}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={cancelCurrentOrder}
                      disabled={saving}
                      className="w-full bg-red-50 border border-red-100 text-red-500 font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all"
                    >
                      {saving ? "Loading..." : "Batalkan"}
                    </button>
                    <button
                      onClick={openCheckout}
                      disabled={saving}
                      className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all"
                    >
                      Bayar • RM {total.toFixed(2)}
                    </button>
                  </div>
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
            <h2 className="text-gray-900 font-bold text-lg">Rekod Jualan</h2>
            <p className="text-gray-400 text-xs mt-1">Semak jualan mengikut tarikh dan download receipt</p>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="relative">
              <button
                onClick={openRekodFilterModal}
                className="inline-flex items-center gap-2 bg-white border border-[var(--accent-200)] text-gray-900 px-4 py-2.5 rounded-full text-xs font-black shadow-sm hover:border-[var(--accent-300)] hover:bg-[var(--accent-50)] active:scale-95 transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[var(--accent-600)]">
                  <path d="M7 3V6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                  <path d="M17 3V6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                  <path d="M4 9H20" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                  <path d="M6.5 5H17.5C18.8807 5 20 6.11929 20 7.5V18C20 19.3807 18.8807 20.5 17.5 20.5H6.5C5.11929 20.5 4 19.3807 4 18V7.5C4 6.11929 5.11929 5 6.5 5Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
                </svg>
                <span>{rekodFilterLabel()}</span>
                <span className="text-gray-400 text-[10px]">▾</span>
              </button>

              {showRekodDropdown && (
                <>
                  <button
                    onClick={() => setShowRekodDropdown(false)}
                    className="fixed inset-0 z-30 cursor-default"
                    aria-label="Tutup filter rekod"
                  />
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl z-40 overflow-hidden">
                    {[
                      { id: "daily", label: "Hari Ini" },
                      { id: "yesterday", label: "Semalam" },
                      { id: "monthly", label: "Bulan Ini" },
                      { id: "weekly", label: "7 Hari Lepas" },
                      { id: "custom", label: "Tarikh Custom" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => applyRekodDropdownFilter(item.id as RekodFilterType)}
                        className={`w-full text-left px-4 py-3 text-sm font-bold border-b border-gray-50 last:border-b-0 active:bg-gray-50 ${rekodFilter === item.id ? "text-[var(--accent-600)] bg-[var(--accent-50)]" : "text-gray-700"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={fetchRekod}
              disabled={loadingRekod}
              className="bg-white border border-gray-200 text-gray-600 text-xs font-black px-4 py-2.5 rounded-full shadow-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {loadingRekod ? "Loading" : "Refresh"}
            </button>
          </div>

          {loadingRekod ? (
            <div className="text-center text-gray-400 py-10">Loading...</div>
          ) : rekod.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-gray-400 text-sm">Tiada rekod dalam tempoh ini</div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 font-black text-sm">🧾 Receipt Preview</h3>
                <span className="text-gray-400 text-xs font-bold">{rekod.length} rekod</span>
              </div>
              <div className="space-y-3">
                {rekod.map((order) => {
                  const receipt = toRecentReceipt(order);
                  return (
                    <div key={order.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 text-sm font-black truncate">#{receipt.id.slice(0, 8).toUpperCase()}</div>
                          <div className="text-gray-400 text-xs mt-1">{displayMejaLabel(receipt.meja)} · {formatReceiptDate(receipt.created_at)}</div>
                          <div className="text-gray-400 text-xs mt-1">{receipt.payment_method || "Belum direkod"}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-[var(--accent-600)] text-sm font-black whitespace-nowrap mr-1">{formatRM(receipt.total)}</div>
                          <button
                            onClick={() => setSelectedReceipt(receipt)}
                            className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
                            aria-label="View receipt"
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            onClick={() => downloadReceipt(order)}
                            className="w-10 h-10 rounded-2xl bg-[var(--accent-600)] text-white flex items-center justify-center active:scale-95 transition-all shadow-sm"
                            aria-label="Download receipt"
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                              <path d="M12 3V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M5 21H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            <div className="mb-3">
              <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD BARU</label>
              <input type="password" value={newPasswordStaff} onChange={(e) => setNewPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
              <input type="password" value={confirmPasswordStaff} onChange={(e) => setConfirmPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            {passwordMsgStaff && (
              <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsgStaff.includes("✅") ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}>{passwordMsgStaff}</div>
            )}
            <button
              onClick={tukarPasswordStaff}
              disabled={!oldPassword || !newPasswordStaff || !confirmPasswordStaff}
              className="w-full bg-[var(--accent-600)] text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              Tukar Password
            </button>
          </div>
        </div>
      )}

      {/* Rekod Custom Date Modal */}
      {showRekodFilterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-gray-900 font-black text-lg">Tarikh Custom</h3>
                <p className="text-gray-400 text-xs font-bold mt-0.5">Pilih range rekod jualan</p>
              </div>
              <button
                onClick={() => setShowRekodFilterModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-black flex items-center justify-center active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-gray-500 text-xs font-black mb-2 block">START DATE</label>
                  <input
                    type="date"
                    value={pendingRekodCustomFrom}
                    onChange={(e) => setPendingRekodCustomFrom(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-bold outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-black mb-2 block">END DATE</label>
                  <input
                    type="date"
                    value={pendingRekodCustomTo}
                    onChange={(e) => setPendingRekodCustomTo(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-gray-900 text-sm font-bold outline-none focus:border-[var(--accent-500)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRekodFilterModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-black py-3.5 rounded-2xl active:scale-95 transition-all"
              >
                Batal
              </button>
              <button
                onClick={applyRekodFilterModal}
                disabled={!pendingRekodCustomFrom || !pendingRekodCustomTo}
                className="flex-1 bg-[var(--accent-600)] text-white font-black py-3.5 rounded-2xl disabled:opacity-50 active:scale-95 transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-gray-900 font-black text-lg">Receipt Preview</h3>
                <div className="text-gray-400 text-xs font-bold">#{selectedReceipt.id.slice(0, 8).toUpperCase()}</div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 font-black">✕</button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5 bg-white">
              <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                <div className="text-gray-900 font-black text-xl">{kedaiInfo?.nama || "Kedai Saya"}</div>
                <div className="text-gray-400 text-xs font-bold mt-1">Powered by UrusPOS</div>
                <div className="text-gray-400 text-xs mt-2">{formatReceiptDate(selectedReceipt.created_at)}</div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 font-bold mb-1"><span>Order</span><span>#{selectedReceipt.id.slice(0, 8).toUpperCase()}</span></div>
                <div className="flex justify-between text-xs text-gray-500 font-bold mb-1"><span>Jenis</span><span>{displayMejaLabel(selectedReceipt.meja)}</span></div>
                <div className="flex justify-between text-xs text-gray-500 font-bold"><span>Bayaran</span><span>{selectedReceipt.payment_method || "Belum direkod"}</span></div>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-4 space-y-3">
                {selectedReceipt.order_items.map((item, index) => (
                  <div key={`${item.nama}-${index}`} className="flex justify-between gap-3 text-sm">
                    <div className="flex-1">
                      <div className="text-gray-900 font-bold">{item.nama}</div>
                      <div className="text-gray-400 text-xs">{item.qty} x {formatRM(item.harga)}</div>
                      {item.nota && <div className="text-amber-600 text-xs mt-1">Nota: {item.nota}</div>}
                    </div>
                    <div className="text-gray-900 font-black">{formatRM(item.qty * item.harga)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
                <div className="flex justify-between items-center"><span className="text-gray-900 font-black">TOTAL</span><span className="text-gray-900 font-black text-xl">{formatRM(selectedReceipt.total)}</span></div>
              </div>
              <div className="text-center text-gray-400 text-xs mt-5">Terima kasih.</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => setSelectedReceipt(null)} className="bg-gray-100 text-gray-600 font-black py-3 rounded-2xl text-sm">Tutup</button>
              <button onClick={() => downloadReceipt(selectedReceipt)} className="bg-[var(--accent-600)] text-white font-black py-3 rounded-2xl text-sm">Download</button>
            </div>
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
                  <button onClick={() => selectPaymentMode("tunai")} disabled={saving} className="bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all">
                    <div className="text-2xl mb-1">💵</div>
                    Tunai
                  </button>
                  <button onClick={() => selectPaymentMode("duitnow")} disabled={saving} className="bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-all">
                    <div className="text-2xl mb-1">📱</div>
                    DuitNow
                  </button>
                </div>
              </>
            )}

            {paymentMode === "tunai" && (
              <div className="mb-3">
                <div className="bg-[var(--accent-50)] border border-[var(--accent-100)] rounded-3xl p-4 mb-3">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="text-[var(--accent-700)] text-xs font-black uppercase tracking-wide">Tunai Diterima</div>
                      <div className="text-gray-900 text-3xl font-black mt-1">RM {cashReceivedNumber.toFixed(2)}</div>
                    </div>
                    <button onClick={setExactCashAmount} className="bg-white border border-[var(--accent-200)] text-[var(--accent-700)] text-xs font-black px-3 py-2 rounded-2xl active:scale-95 transition-all">Exact</button>
                  </div>

                  <div className={`rounded-2xl p-3 ${cashReceived ? cashBalance >= 0 ? "bg-white border border-[var(--accent-200)]" : "bg-red-50 border border-red-100" : "bg-white border border-gray-100"}`}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-500">Baki perlu diberi</span>
                      <span className={cashReceived && cashBalance < 0 ? "text-red-600" : "text-[var(--accent-700)]"}>
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

                <button onClick={() => completePayment("tunai")} disabled={saving || !cashReceived || cashBalance < 0} className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all">
                  {saving ? "Mengesahkan..." : `Sahkan Tunai Diterima • Baki RM ${Math.max(0, cashBalance).toFixed(2)}`}
                </button>
              </div>
            )}

            {paymentMode === "duitnow" && (
              <div className="mb-3">
                <div className="bg-[var(--accent-50)] border border-[var(--accent-100)] rounded-3xl p-5 mb-4 text-center">
                  <div className="text-[var(--accent-700)] text-xs font-black uppercase tracking-wide mb-3">DuitNow QR Kedai</div>
                  {duitNowQrUrl ? (
                    <div className="bg-white rounded-3xl border border-[var(--accent-100)] p-3 mx-auto w-fit shadow-sm">
                      <img src={duitNowQrUrl} alt="DuitNow QR kedai" className="w-52 h-52 object-contain rounded-2xl mx-auto" />
                    </div>
                  ) : (
                    <div className="w-52 h-52 rounded-3xl bg-white border-2 border-dashed border-[var(--accent-200)] mx-auto flex flex-col items-center justify-center p-4">
                      <div className="text-5xl mb-3">📱</div>
                      <div className="text-gray-900 text-sm font-black">QR DuitNow belum diset</div>
                      <div className="text-gray-400 text-xs mt-1 leading-relaxed">Owner perlu upload QR di Owner Dashboard → Tetapan → Setup Kedai.</div>
                    </div>
                  )}
                  <div className="text-gray-900 text-3xl font-black mt-4">RM {total.toFixed(2)}</div>
                  <div className="text-[var(--accent-600)] text-xs font-bold mt-1">
                    {duitNowQrUrl ? "Minta customer scan dan bayar jumlah ini." : "DuitNow belum boleh digunakan selagi QR belum diset."}
                  </div>
                </div>

                {paymentError && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl p-3 mb-3">⚠️ {paymentError}</div>}

                <button onClick={() => completePayment("duitnow")} disabled={saving || !duitNowQrUrl} className="w-full bg-[var(--accent-600)] text-white font-black py-4 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all">
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
            <div className="text-[var(--accent-600)] text-3xl font-black my-4">RM {lastTotal.toFixed(2)}</div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left">
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Kaedah bayaran</span><span className="text-gray-900 font-bold">{lastPaymentMethod || "-"}</span></div>
              {lastPaymentMethod === "Tunai" && (
                <>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Tunai diterima</span><span className="text-gray-900 font-bold">RM {lastCashReceived.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Baki diberi</span><span className="text-[var(--accent-600)] font-bold">RM {lastCashChange.toFixed(2)}</span></div>
                </>
              )}
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Stok dikemaskini</span><span className="text-[var(--accent-600)]">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>COGS direkod</span><span className="text-[var(--accent-600)]">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Laporan dikemaskini</span><span className="text-[var(--accent-600)]">✓</span></div>
            </div>
            <button onClick={() => { setShowSuccess(false); clearCart(); }} className="w-full bg-[var(--accent-600)] text-white font-bold py-4 rounded-2xl text-sm mb-3">Jualan Baru</button>
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
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            <div className="mb-3">
              <label className="text-gray-500 text-xs font-bold mb-1 block">PASSWORD BARU</label>
              <input type="password" value={newPasswordStaff} onChange={(e) => setNewPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold mb-1 block">CONFIRM PASSWORD BARU</label>
              <input type="password" value={confirmPasswordStaff} onChange={(e) => setConfirmPasswordStaff(e.target.value)} placeholder="••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-[var(--accent-500)]" />
            </div>
            {passwordMsgStaff && (
              <div className={`text-xs font-bold mb-3 p-3 rounded-xl ${passwordMsgStaff.includes("✅") ? "bg-[var(--accent-50)] text-[var(--accent-700)]" : "bg-red-50 text-red-600"}`}>{passwordMsgStaff}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowTukarPassword(false); setOldPassword(""); setNewPasswordStaff(""); setConfirmPasswordStaff(""); setPasswordMsgStaff(""); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl">Batal</button>
              <button onClick={tukarPasswordStaff} disabled={!oldPassword || !newPasswordStaff || !confirmPasswordStaff} className="flex-1 bg-[var(--accent-600)] text-white font-bold py-3 rounded-xl disabled:opacity-50">Tukar</button>
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