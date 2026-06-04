"use client";

import { useEffect, useState } from "react";

type OrderItem = {
  nama: string;
  qty: number;
  nota?: string;
};

type Order = {
  id: string;
  meja: string;
  items: OrderItem[];
  masa: string;
  done: boolean;
};

// Demo orders — nanti connect ke real database
const demoOrders: Order[] = [
  {
    id: "1",
    meja: "T2",
    items: [
      { nama: "Nasi Lemak", qty: 2, nota: "" },
      { nama: "Teh Tarik", qty: 3, nota: "Kurang manis" },
    ],
    masa: "3 min",
    done: false,
  },
  {
    id: "2",
    meja: "Bungkus",
    items: [{ nama: "Kopi O Ais", qty: 2, nota: "Extra ais" }],
    masa: "1 min",
    done: false,
  },
  {
    id: "3",
    meja: "T5",
    items: [
      { nama: "Nasi Lemak", qty: 1, nota: "" },
      { nama: "Kopi O Ais", qty: 1, nota: "" },
    ],
    masa: "8 min",
    done: false,
  },
  {
    id: "4",
    meja: "T1",
    items: [{ nama: "Teh Tarik", qty: 4, nota: "" }],
    masa: "12 min",
    done: true,
  },
  {
    id: "5",
    meja: "T3",
    items: [{ nama: "Nasi Lemak", qty: 2, nota: "" }],
    masa: "15 min",
    done: true,
  },
];

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${h}:${m}`);
    }
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  function markDone(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, done: true } : o))
    );
  }

  function undoDone(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, done: false } : o))
    );
  }

  const newOrders = orders.filter((o) => !o.done);
  const doneOrders = orders.filter((o) => o.done);

  return (
    <div className="min-h-screen bg-[#1c1917] flex flex-col">
      {/* Header */}
      <div className="bg-[#0c0a09] px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-stone-800">
        <div>
          <span className="text-white font-bold text-lg">Urus<span className="text-orange-400">POS</span></span>
          <span className="ml-2 text-stone-500 text-sm">Dapur</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-stone-400 text-xs">Live</span>
          </div>
          <span className="text-stone-300 text-sm font-bold">{currentTime}</span>
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

      {/* Kitchen Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* New Orders Column */}
        <div className="flex-1 flex flex-col border-r border-stone-800 overflow-hidden">
          <div className="bg-[#292524] px-4 py-2 flex-shrink-0 border-b border-stone-700">
            <span className="text-orange-400 text-xs font-black tracking-widest uppercase">
              ⏳ Baru Masuk ({newOrders.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {newOrders.length === 0 ? (
              <div className="text-center text-stone-600 text-sm py-8">
                Tiada order baru 🎉
              </div>
            ) : (
              newOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#292524] rounded-2xl p-3 border border-stone-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-black text-sm">
                      Meja {order.meja}
                    </span>
                    <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded-full">
                      {order.masa} lepas
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-orange-400 font-black text-sm min-w-6">
                          {item.qty}×
                        </span>
                        <div>
                          <span className="text-stone-200 text-sm font-medium">
                            {item.nama}
                          </span>
                          {item.nota && (
                            <div className="text-stone-500 text-xs mt-0.5">
                              📝 {item.nota}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => markDone(order.id)}
                    className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-all"
                  >
                    ✓ Tandakan Siap
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Done Orders Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-[#1a2e1a] px-4 py-2 flex-shrink-0 border-b border-green-900/50">
            <span className="text-green-400 text-xs font-black tracking-widest uppercase">
              ✅ Siap ({doneOrders.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {doneOrders.length === 0 ? (
              <div className="text-center text-stone-600 text-sm py-8">
                Belum ada siap
              </div>
            ) : (
              doneOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#1a2e1a] rounded-2xl p-3 border border-green-900/40 opacity-70"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-stone-400 font-black text-sm">
                      Meja {order.meja}
                    </span>
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                      Siap ✓
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-green-500 font-black text-sm min-w-6">
                          {item.qty}×
                        </span>
                        <span className="text-stone-500 text-sm line-through">
                          {item.nama}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => undoDone(order.id)}
                    className="w-full bg-green-500/20 text-green-400 font-bold py-2 rounded-xl text-xs border border-green-500/30"
                  >
                    ↩ Undo
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}