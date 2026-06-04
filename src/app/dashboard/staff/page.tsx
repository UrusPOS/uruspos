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
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const mejaList = ["T1", "T2", "T3", "T4", "T5", "T6", "Bungkus"];

  useEffect(() => {
    fetchProduk();
  }, []);

  async function fetchProduk() {
    const { data } = await supabase
      .from("produk")
      .select("*")
      .eq("is_active", true)
      .order("nama");
    setProduk(data || []);
    setLoading(false);
  }

  function addToCart(item: Produk) {
    if (item.stok === 0) return;
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        ...item,
        qty: (prev[item.id]?.qty || 0) + 1,
      },
    }));
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      }
      return { ...prev, [id]: { ...current, qty: newQty } };
    });
  }

  function clearCart() {
    setCart({});
    setOrderSent(false);
  }

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, i) => s + i.harga_jual * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  async function sendOrder() {
    if (cartItems.length === 0) return;
    // In real app — save to orders table & trigger kitchen
    setOrderSent(true);
  }

  async function completePayment() {
    // In real app — record transaction, update stock, calculate COGS
    setShowCheckout(false);
    setShowSuccess(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-gray-900 font-bold text-lg">Urus<span className="text-green-600">POS</span></span>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
            🧑‍💼 Ali
          </div>
          <a href="/auth/logout" className="text-gray-400 text-xs">Keluar</a>
        </div>
      </div>

      {/* Meja Selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        {mejaList.map((meja) => (
          <button
            key={meja}
            onClick={() => { setCurrentMeja(meja); clearCart(); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${
              currentMeja === meja
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-400 border-gray-200"
            }`}
          >
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
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.stok === 0}
                className={`bg-white rounded-2xl p-3 text-center border-2 transition-all shadow-sm relative ${
                  cart[item.id]?.qty > 0
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100"
                } ${item.stok === 0 ? "opacity-40" : "active:scale-95"}`}
              >
                {cart[item.id]?.qty > 0 && (
                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {cart[item.id].qty}
                  </div>
                )}
                <div className="text-2xl mb-1">🍽️</div>
                <div className="text-gray-900 text-xs font-bold leading-tight">{item.nama}</div>
                <div className="text-green-600 text-xs font-black mt-1">RM {item.harga_jual.toFixed(2)}</div>
                {item.stok <= 5 && item.stok > 0 && (
                  <div className="text-amber-500 text-xs mt-0.5">Tinggal {item.stok}</div>
                )}
                {item.stok === 0 && (
                  <div className="text-red-400 text-xs mt-0.5">Habis</div>
                )}
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
            {cartCount > 0 && (
              <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount} item
              </span>
            )}
          </span>
          {cartCount > 0 && (
            <button onClick={clearCart} className="text-red-400 text-xs font-bold bg-red-50 px-3 py-1 rounded-full">
              Kosong
            </button>
          )}
        </div>

        {/* Cart Items */}
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

        {cartItems.length === 0 && (
          <div className="text-center text-gray-300 text-xs py-3">Tiada item dipilih</div>
        )}

        {/* Total & Buttons */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-sm">Jumlah</span>
          <span className="text-gray-900 text-xl font-black">RM {total.toFixed(2)}</span>
        </div>

        {!orderSent ? (
          <button
            onClick={sendOrder}
            disabled={cartItems.length === 0}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-30 active:scale-99 transition-all"
          >
            Hantar ke Dapur 🍳
          </button>
        ) : (
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-99 transition-all"
          >
            Checkout & Bayar 💳
          </button>
        )}
      </div>

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
              <button onClick={completePayment} className="bg-green-600 text-white font-bold py-4 rounded-2xl text-sm">
                💵 Tunai
              </button>
              <button onClick={completePayment} className="bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm">
                📱 DuitNow
              </button>
            </div>
            <button onClick={() => setShowCheckout(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-sm">
              Batal
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
            <div className="text-green-600 text-3xl font-black my-4">RM {total.toFixed(2)}</div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left">
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Stok dikemaskini</span><span className="text-green-600">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>COGS direkod</span><span className="text-green-600">✓</span></div>
              <div className="flex justify-between text-xs text-gray-500 py-1"><span>Laporan dikemaskini</span><span className="text-green-600">✓</span></div>
            </div>
            <button
              onClick={() => { setShowSuccess(false); clearCart(); }}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-sm mb-3"
            >
              Jualan Baru
            </button>
            <button className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-sm">
              📱 Resit WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}