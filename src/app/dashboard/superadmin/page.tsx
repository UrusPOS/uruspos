"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kedai = {
  id: string;
  nama: string;
  status: string;
  tema_warna: string;
  created_at: string;
};

type KedaiStats = {
  kedai_id: string;
  jualan: number;
  fee: number;
  staff: number;
};

type FilterType = "daily" | "weekly" | "monthly" | "custom";
type PendingStatusChange = {
  id: string;
  nama: string;
  currentStatus: string;
  targetStatus: string;
};

function getDateRange(
  filter: FilterType,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (filter === "daily") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "weekly") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (filter === "custom" && customFrom && customTo) {
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    const toCustom = new Date(customTo);
    toCustom.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: toCustom.toISOString() };
  }
  // fallback daily
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function SuperadminDashboardPage() {
  const [kedaiList, setKedaiList] = useState<Kedai[]>([]);
  const [kedaiStats, setKedaiStats] = useState<{ [id: string]: KedaiStats }>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] =
    useState<PendingStatusChange | null>(null);
  const [showAddKedai, setShowAddKedai] = useState(false);
  const [newKedaiNama, setNewKedaiNama] = useState("");
  const [newKedaiPlan, setNewKedaiPlan] = useState("beta");
  const [saving, setSaving] = useState(false);
  const [newKedaiOwnerNama, setNewKedaiOwnerNama] = useState("");
  const [newKedaiTelefon, setNewKedaiTelefon] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{
    username: string;
    password: string;
    kedaiNama: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("dash");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [credentialsList, setCredentialsList] = useState<any[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [viewCreds, setViewCreds] = useState<{
    nama: string;
    username: string;
    password: string;
    kedaiNama: string;
  } | null>(null);

  // Filter states
  const [filter, setFilter] = useState<FilterType>("daily");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilter, setTempFilter] = useState<FilterType>("daily");
  const [tempCustomFrom, setTempCustomFrom] = useState("");
  const [tempCustomTo, setTempCustomTo] = useState("");

  useEffect(() => {
    fetchKedai();
  }, [filter, customFrom, customTo]);

  async function fetchKedai() {
    const { data } = await supabase
      .from("kedai")
      .select("*")
      .order("created_at", { ascending: false });
    setKedaiList(data || []);
    if (data && data.length > 0) await fetchAllStats(data);
    setLoading(false);
  }

  async function fetchAllStats(kedais: Kedai[]) {
    const { from, to } = getDateRange(filter, customFrom, customTo);
    const statsMap: { [id: string]: KedaiStats } = {};
    for (const kedai of kedais) {
      const { data: orders } = (await supabase
        .from("orders")
        .select("total")
        .in("status", ["paid", "done"])
        .eq("kedai_id", kedai.id)
        .gte("created_at", from)
        .lte("created_at", to)) as any;
      const { data: staffData } = (await supabase
        .from("users")
        .select("id")
        .eq("kedai_id", kedai.id)
        .neq("role", "superadmin")) as any;
      const jualan =
        orders?.reduce((s: number, o: any) => s + Number(o.total), 0) || 0;
      statsMap[kedai.id] = {
        kedai_id: kedai.id,
        jualan,
        fee: kedai.status === "beta" ? 0 : jualan * 0.02,
        staff: staffData?.length || 0,
      };
    }
    setKedaiStats(statsMap);
  }

  function statusLabel(status: string) {
    if (status === "active") return "Aktif";
    if (status === "beta") return "Beta";
    if (status === "suspended") return "Suspended";
    return status;
  }

  function requestStatusChange(kedai: Kedai, targetStatus: string) {
    setConfirmStatusChange({
      id: kedai.id,
      nama: kedai.nama,
      currentStatus: kedai.status,
      targetStatus,
    });
  }

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("kedai")
      .update({ status } as any)
      .eq("id", id);
    setConfirmStatusChange(null);
    fetchKedai();
  }

  async function deleteKedai(id: string) {
    const { data: orders } = (await supabase
      .from("orders")
      .select("id")
      .eq("kedai_id", id)) as any;
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      await supabase.from("order_items").delete().in("order_id", orderIds);
      await supabase.from("orders").delete().eq("kedai_id", id);
    }
    await supabase.from("users").delete().eq("kedai_id", id);
    await supabase.from("produk").delete().eq("kedai_id", id);
    await supabase.from("kedai").delete().eq("id", id);
    setConfirmDelete(null);
    fetchKedai();
  }

  async function addKedai() {
    if (!newKedaiNama.trim() || !newKedaiOwnerNama.trim()) return;
    setSaving(true);
    const username =
      newKedaiNama
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12) + Math.floor(Math.random() * 100);
    const password = Math.random().toString(36).slice(-8).toUpperCase();
    const { data: kedai } = (await supabase
      .from("kedai")
      .insert({
        nama: newKedaiNama,
        status: newKedaiPlan,
        tema_warna: "#16a34a",
      } as any)
      .select()
      .single()) as any;
    if (kedai) {
      await supabase
        .from("users")
        .insert({
          nama: newKedaiOwnerNama,
          username,
          role: "owner",
          is_active: true,
          kedai_id: kedai.id,
          password,
        } as any);
      setGeneratedCreds({ username, password, kedaiNama: newKedaiNama });
    }
    setNewKedaiNama("");
    setNewKedaiOwnerNama("");
    setNewKedaiTelefon("");
    setNewKedaiPlan("beta");
    setShowAddKedai(false);
    setSaving(false);
    fetchKedai();
  }

  async function fetchCredentials(kedaiId: string) {
    setLoadingCreds(true);
    setShowCredentials(kedaiId);
    const { data } = (await supabase
      .from("users")
      .select("nama, username, password, role, is_active")
      .eq("kedai_id", kedaiId)
      .order("role")) as any;
    setCredentialsList(data || []);
    setLoadingCreds(false);
  }

  function openFilterModal() {
    setTempFilter(filter);
    setTempCustomFrom(customFrom);
    setTempCustomTo(customTo);
    setShowFilterModal(true);
  }

  function applyDateFilter() {
    if (tempFilter === "custom" && (!tempCustomFrom || !tempCustomTo)) return;

    setFilter(tempFilter);

    if (tempFilter === "custom") {
      setCustomFrom(tempCustomFrom);
      setCustomTo(tempCustomTo);
    }

    setShowFilterModal(false);
  }

  function formatDateLabel(date: string) {
    return new Date(date).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function filterLabel() {
    if (filter === "daily") return "Hari Ini";
    if (filter === "weekly") return "Minggu";
    if (filter === "monthly") return "Bulan Ini";

    if (filter === "custom" && customFrom && customTo) {
      return `${formatDateLabel(customFrom)} — ${formatDateLabel(customTo)}`;
    }

    return "Tarikh Custom";
  }

  const totalJualan = Object.values(kedaiStats).reduce(
    (s, k) => s + k.jualan,
    0,
  );
  const totalFee = Object.values(kedaiStats).reduce((s, k) => s + k.fee, 0);
  const stats = {
    total: kedaiList.length,
    active: kedaiList.filter((k) => k.status === "active").length,
    beta: kedaiList.filter((k) => k.status === "beta").length,
    suspended: kedaiList.filter((k) => k.status === "suspended").length,
  };

  const menuItems = [
    {
      id: "dash",
      label: "Dashboard",
      icon: "📊",
      description: "Ringkasan semua kedai",
    },
    {
      id: "kedai",
      label: "Kedai",
      icon: "🏪",
      description: "Senarai & status kedai",
    },
    {
      id: "billing",
      label: "Billing",
      icon: "💰",
      description: "Fee & langganan",
    },
  ];

  function activeMenuLabel() {
    return (
      menuItems.find((item) => item.id === activeTab)?.label || "Dashboard"
    );
  }

  function handleChangeTab(tabId: string) {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  }

  // Date filter button (reused across tabs)
  const FilterBar = ({ compact = false }: { compact?: boolean } = {}) => (
    <div className={compact ? "" : "mb-4 mt-4"}>
      <button
        onClick={openFilterModal}
        className="inline-flex items-center gap-2 rounded-full bg-purple-700/20 border border-purple-500/40 text-white px-4 py-2.5 text-sm font-black shadow-lg shadow-black/10 hover:bg-purple-700/30 hover:border-purple-400 transition-all whitespace-nowrap"
      >
        <span className="text-base">📅</span>
        <span>{filterLabel()}</span>
        <span className="text-purple-300 text-xs">▾</span>
      </button>
    </div>
  );

  const MobileMenuDrawer = () => (
    <>
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Tutup menu"
            onClick={() => setShowMobileMenu(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
          />

          <div className="relative h-full w-[84%] max-w-sm bg-[#0f0a1e] border-r border-purple-900/40 shadow-2xl animate-[slideInLeft_0.25s_ease-out] overflow-y-auto">
            <div className="p-5 border-b border-purple-900/30 bg-[#1a0e35]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-xl">
                    Urus<span className="text-purple-400">POS</span>
                  </div>
                  <div className="text-purple-300 text-xs font-bold mt-1 tracking-wider">
                    SUPERADMIN MENU
                  </div>
                </div>

                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-10 h-10 rounded-2xl bg-purple-900/50 border border-purple-700/60 text-purple-200 font-black"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="bg-[#1a0e35] border border-purple-900/40 rounded-3xl p-4 mb-5">
                <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Sedang Dibuka
                </div>
                <div className="text-white text-lg font-black">
                  {activeMenuLabel()}
                </div>
              </div>

              <div className="text-purple-400 text-xs font-black uppercase tracking-[0.18em] mb-3 px-1">
                Navigasi
              </div>

              <div className="space-y-3">
                {menuItems.map((item) => {
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleChangeTab(item.id)}
                      className={`w-full flex items-center gap-4 rounded-3xl p-4 text-left border transition-all ${
                        isActive
                          ? "bg-purple-700 border-purple-500 text-white shadow-lg shadow-purple-950/30"
                          : "bg-[#1a0e35] border-purple-900/40 text-purple-200 hover:border-purple-600 hover:bg-purple-950/50"
                      }`}
                    >
                      <span
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                          isActive ? "bg-white/20" : "bg-purple-900/50"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block font-black text-sm">
                          {item.label}
                        </span>
                        <span
                          className={`block text-xs mt-1 ${isActive ? "text-purple-100" : "text-purple-400"}`}
                        >
                          {item.description}
                        </span>
                      </span>
                      {isActive && (
                        <span className="text-white font-black">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <div className="bg-[#1a0e35] border-b border-purple-900/30 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden w-11 h-11 rounded-2xl bg-[#0f0a1e] border border-purple-800/60 text-white text-xl font-black flex items-center justify-center shadow-lg"
            aria-label="Buka menu"
          >
            ☰
          </button>

          <div>
            <span className="text-white font-bold text-xl">
              Urus<span className="text-purple-400">POS</span>
            </span>
            <span className="hidden sm:inline-block ml-3 bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full">
              SUPERADMIN
            </span>
            <div className="md:hidden text-purple-400 text-xs font-bold mt-0.5">
              {activeMenuLabel()}
            </div>
          </div>
        </div>

        <a
          href="/auth/logout"
          className="text-purple-400 text-sm font-semibold hover:text-white"
        >
          Log Keluar
        </a>
      </div>

      <MobileMenuDrawer />

      <div className="hidden md:flex bg-[#1a0e35] border-b border-purple-900/20 justify-center">
        <div className="max-w-2xl w-full flex">
          {menuItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleChangeTab(tab.id)}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-purple-400 text-purple-400"
                  : "border-transparent text-stone-500 hover:text-purple-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {activeTab === "dash" && (
          <div>
            <FilterBar />
            <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-4">
              <div className="text-purple-200 text-sm font-medium">
                Fee Terkumpul — {filterLabel()}
              </div>
              <div className="text-white text-4xl font-black mt-1">
                RM {totalFee.toFixed(2)}
              </div>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  📊 Jualan RM {totalJualan.toFixed(2)}
                </span>
                <span className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
                  ✓ {stats.active} Aktif
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">🏪</div>
                <div className="text-white text-xl font-black">
                  {stats.total}
                </div>
                <div className="text-purple-400 text-xs mt-1">Jumlah Kedai</div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-white text-xl font-black">
                  RM {totalJualan.toFixed(0)}
                </div>
                <div className="text-purple-400 text-xs mt-1">
                  Jualan Semua Kedai
                </div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-yellow-400 text-xl font-black">
                  {stats.beta}
                </div>
                <div className="text-purple-400 text-xs mt-1">Beta (Free)</div>
              </div>
              <div className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30">
                <div className="text-2xl mb-2">⊘</div>
                <div className="text-red-400 text-xl font-black">
                  {stats.suspended}
                </div>
                <div className="text-purple-400 text-xs mt-1">Suspended</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "kedai" && (
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="text-white font-bold text-lg">
                Senarai Kedai ({kedaiList.length})
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <FilterBar compact />
                <button
                  onClick={() => setShowAddKedai(true)}
                  className="bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-purple-600 transition-all whitespace-nowrap"
                >
                  + Kedai Baru
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center text-purple-400 py-10">
                Loading...
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {kedaiList.map((kedai) => {
                  const s = kedaiStats[kedai.id];
                  return (
                    <div
                      key={kedai.id}
                      className="bg-[#1a0e35] rounded-2xl p-4 border border-purple-900/30"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="text-white font-bold leading-tight break-words">
                            {kedai.nama}
                          </div>
                          <div className="text-purple-400 text-xs mt-1">
                            ID: {kedai.id.slice(0, 8)}...
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${kedai.status === "active" ? "bg-green-500/20 text-green-300" : kedai.status === "beta" ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}
                          >
                            {kedai.status === "active"
                              ? "Aktif"
                              : kedai.status === "beta"
                                ? "Beta"
                                : "Suspended"}
                          </span>

                          <button
                            onClick={() => setConfirmDelete(kedai.id)}
                            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30 hover:bg-red-500/30 transition-all"
                            title="Buang Kedai"
                          >
                            <span>🗑</span>
                            <span className="hidden sm:inline ml-1.5">
                              Buang
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-3 border-t border-purple-900/30 mb-3">
                        <div className="text-center">
                          <div className="text-white text-sm font-black">
                            RM {s?.jualan.toFixed(2) || "0.00"}
                          </div>
                          <div className="text-purple-400 text-xs">Jualan</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-300 text-sm font-black">
                            {kedai.status === "beta" ? (
                              <span className="text-yellow-400">—</span>
                            ) : (
                              `RM ${s?.fee.toFixed(2) || "0.00"}`
                            )}
                          </div>
                          <div className="text-purple-400 text-xs">
                            {kedai.status === "beta"
                              ? "Beta (Free)"
                              : "Fee (2%)"}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-300 text-sm font-black">
                            {s?.staff || 0}
                          </div>
                          <div className="text-purple-400 text-xs">Staff</div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {kedai.status !== "active" && (
                          <button
                            onClick={() => requestStatusChange(kedai, "active")}
                            className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-2 rounded-xl border border-green-500/30"
                          >
                            ✓ Aktifkan
                          </button>
                        )}
                        {kedai.status !== "beta" && (
                          <button
                            onClick={() => requestStatusChange(kedai, "beta")}
                            className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-2 rounded-xl border border-yellow-500/30"
                          >
                            ⏳ Beta
                          </button>
                        )}
                        {kedai.status !== "suspended" && (
                          <button
                            onClick={() =>
                              requestStatusChange(kedai, "suspended")
                            }
                            className="bg-orange-500/20 text-orange-300 text-xs font-bold px-3 py-2 rounded-xl border border-orange-500/30"
                          >
                            ⊘ Suspend
                          </button>
                        )}
                        <button
                          onClick={() => fetchCredentials(kedai.id)}
                          className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-2 rounded-xl border border-blue-500/30"
                        >
                          🔑 Credentials
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="mt-4">
            <FilterBar />
            <div className="bg-gradient-to-br from-[#3b0764] to-[#7c3aed] rounded-2xl p-6 mb-4">
              <div className="text-purple-200 text-sm">
                Fee Terkumpul — {filterLabel()}
              </div>
              <div className="text-white text-3xl font-black mt-1">
                RM {totalFee.toFixed(2)}
              </div>
              <div className="text-purple-200 text-xs mt-2">
                Daripada {stats.active} kedai berbayar
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {kedaiList.map((kedai) => {
                const s = kedaiStats[kedai.id];
                return (
                  <div
                    key={kedai.id}
                    className={`bg-[#1a0e35] rounded-2xl p-4 border ${kedai.status === "suspended" ? "border-red-500/30" : kedai.status === "beta" ? "border-yellow-500/20" : "border-green-500/20"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-bold text-sm">
                          {kedai.nama}
                        </div>
                        <div className="text-purple-400 text-xs mt-1">
                          {kedai.status === "beta"
                            ? "Beta — Free"
                            : `Jualan RM ${s?.jualan.toFixed(2) || "0.00"}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-black ${kedai.status === "suspended" ? "text-red-400" : kedai.status === "beta" ? "text-yellow-400" : "text-green-400"}`}
                        >
                          {kedai.status === "beta"
                            ? "RM 0"
                            : `RM ${s?.fee.toFixed(2) || "0.00"}`}
                        </div>
                        <div
                          className={`text-xs font-bold mt-1 ${kedai.status === "suspended" ? "text-red-400" : kedai.status === "beta" ? "text-yellow-400" : "text-green-400"}`}
                        >
                          {kedai.status === "active"
                            ? "✓ Aktif"
                            : kedai.status === "beta"
                              ? "⏳ Beta"
                              : "⊘ Suspended"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-[#160b2e] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border border-purple-500/30 shadow-2xl overflow-hidden animate-[filterSheetUp_0.22s_ease-out]">
            <div className="p-5 border-b border-purple-900/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-black text-lg">Filter by</div>
                  <div className="text-purple-400 text-xs font-semibold mt-1">
                    Pilih tempoh laporan superadmin
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-9 h-9 rounded-full bg-purple-900/50 border border-purple-700/50 text-purple-200 font-black"
                  aria-label="Tutup filter"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-2 mb-5">
                {(
                  [
                    { value: "daily", label: "Hari Ini" },
                    { value: "weekly", label: "Minggu" },
                    { value: "monthly", label: "Bulan Ini" },
                    { value: "custom", label: "Tarikh Custom" },
                  ] as { value: FilterType; label: string }[]
                ).map((option) => {
                  const isActive = tempFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => setTempFilter(option.value)}
                      className={`rounded-full px-3 py-2.5 text-xs font-black border transition-all ${
                        isActive
                          ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-950/40"
                          : "bg-[#0f0a1e] border-purple-900/60 text-purple-300 hover:border-purple-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {tempFilter === "custom" && (
                <div className="bg-[#0f0a1e] border border-purple-900/60 rounded-3xl p-4 mb-5">
                  <div className="text-purple-300 text-xs font-black uppercase tracking-wider mb-3">
                    Julat Tarikh
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-purple-400 text-xs font-bold mb-2 block">
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={tempCustomFrom}
                        onChange={(e) => setTempCustomFrom(e.target.value)}
                        className="w-full bg-[#160b2e] border border-purple-700 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-purple-400 text-xs font-bold mb-2 block">
                        End Date
                      </span>
                      <input
                        type="date"
                        value={tempCustomTo}
                        onChange={(e) => setTempCustomTo(e.target.value)}
                        className="w-full bg-[#160b2e] border border-purple-700 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
                      />
                    </label>
                  </div>

                  {tempCustomFrom && tempCustomTo && (
                    <div className="mt-3 text-xs text-purple-300 font-semibold">
                      {formatDateLabel(tempCustomFrom)} —{" "}
                      {formatDateLabel(tempCustomTo)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 bg-purple-900/40 text-purple-300 font-black py-3 rounded-2xl border border-purple-700/60"
                >
                  Batal
                </button>
                <button
                  onClick={applyDateFilter}
                  disabled={
                    tempFilter === "custom" &&
                    (!tempCustomFrom || !tempCustomTo)
                  }
                  className="flex-1 bg-purple-700 text-white font-black py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Status Change */}
      {confirmStatusChange && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30">
            <div className="text-3xl text-center mb-3">⚙️</div>
            <h3 className="text-white font-bold text-lg text-center mb-2">
              Tukar Status Kedai?
            </h3>
            <p className="text-purple-300 text-sm text-center mb-5 leading-relaxed">
              Anda pasti nak tukar status{" "}
              <span className="text-white font-bold">
                {confirmStatusChange.nama}
              </span>{" "}
              daripada
              <span className="text-yellow-300 font-bold">
                {" "}
                {statusLabel(confirmStatusChange.currentStatus)}
              </span>{" "}
              kepada
              <span className="text-green-300 font-bold">
                {" "}
                {statusLabel(confirmStatusChange.targetStatus)}
              </span>
              ?
            </p>

            <div className="bg-[#0f0a1e] border border-purple-900/50 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                  <div className="text-purple-400 text-xs font-bold mb-1">
                    SEKARANG
                  </div>
                  <div className="text-white text-sm font-black">
                    {statusLabel(confirmStatusChange.currentStatus)}
                  </div>
                </div>
                <div className="text-purple-500 font-black">→</div>
                <div className="text-center flex-1">
                  <div className="text-purple-400 text-xs font-bold mb-1">
                    BARU
                  </div>
                  <div className="text-white text-sm font-black">
                    {statusLabel(confirmStatusChange.targetStatus)}
                  </div>
                </div>
              </div>
            </div>

            {confirmStatusChange.targetStatus === "suspended" && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 mb-5">
                <div className="text-orange-300 text-xs font-bold leading-relaxed">
                  Kedai yang disuspend mungkin tidak patut diberi akses operasi
                  sehingga diaktifkan semula.
                </div>
              </div>
            )}

            {confirmStatusChange.targetStatus === "active" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 mb-5">
                <div className="text-green-300 text-xs font-bold leading-relaxed">
                  Status aktif akan mengira fee berdasarkan jualan kedai.
                </div>
              </div>
            )}

            {confirmStatusChange.targetStatus === "beta" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 mb-5">
                <div className="text-yellow-300 text-xs font-bold leading-relaxed">
                  Status beta tidak akan mengenakan fee kepada kedai ini.
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStatusChange(null)}
                className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  updateStatus(
                    confirmStatusChange.id,
                    confirmStatusChange.targetStatus,
                  )
                }
                className={`flex-1 text-white font-bold py-3 rounded-xl ${
                  confirmStatusChange.targetStatus === "suspended"
                    ? "bg-orange-600"
                    : confirmStatusChange.targetStatus === "beta"
                      ? "bg-yellow-600"
                      : "bg-green-600"
                }`}
              >
                Ya, Tukar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-red-500/30">
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h3 className="text-white font-bold text-lg text-center mb-2">
              Buang Kedai?
            </h3>
            <p className="text-purple-400 text-sm text-center mb-6">
              Tindakan ini tidak boleh dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700"
              >
                Batal
              </button>
              <button
                onClick={() => deleteKedai(confirmDelete)}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl"
              >
                Ya, Buang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Kedai */}
      {showAddKedai && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div
            className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <h3 className="text-white font-bold text-lg mb-6">
              ➕ Tambah Kedai Baru
            </h3>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">
                NAMA KEDAI
              </label>
              <input
                type="text"
                value={newKedaiNama}
                onChange={(e) => setNewKedaiNama(e.target.value)}
                placeholder="cth: Kedai Makan Pak Ali"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">
                NAMA OWNER
              </label>
              <input
                type="text"
                value={newKedaiOwnerNama}
                onChange={(e) => setNewKedaiOwnerNama(e.target.value)}
                placeholder="cth: Encik Ali bin Ahmad"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>
            <div className="mb-4">
              <label className="text-purple-400 text-xs font-bold mb-2 block">
                NO TELEFON (OPTIONAL)
              </label>
              <input
                type="text"
                value={newKedaiTelefon}
                onChange={(e) => setNewKedaiTelefon(e.target.value)}
                placeholder="cth: 0123456789"
                className="w-full bg-[#0f0a1e] border border-purple-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-400"
              />
            </div>
            <div className="mb-6">
              <label className="text-purple-400 text-xs font-bold mb-2 block">
                PLAN
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNewKedaiPlan("beta")}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all ${newKedaiPlan === "beta" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" : "bg-transparent border-purple-700 text-purple-400"}`}
                >
                  ⏳ Beta
                  <div className="text-xs font-normal mt-1">Free 2 bulan</div>
                </button>
                <button
                  onClick={() => setNewKedaiPlan("active")}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all ${newKedaiPlan === "active" ? "bg-green-500/20 border-green-500 text-green-300" : "bg-transparent border-purple-700 text-purple-400"}`}
                >
                  ✓ Aktif
                  <div className="text-xs font-normal mt-1">2% jualan</div>
                </button>
              </div>
            </div>
            {newKedaiNama && (
              <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-3 mb-4">
                <div className="text-purple-400 text-xs font-bold mb-1">
                  PREVIEW CREDENTIALS
                </div>
                <div className="text-purple-200 text-xs">
                  Username:{" "}
                  <strong className="text-white font-mono">
                    {newKedaiNama
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .replace(/[^a-z0-9]/g, "")
                      .slice(0, 12)}
                    XX
                  </strong>
                </div>
                <div className="text-purple-200 text-xs mt-1">
                  Password:{" "}
                  <strong className="text-white">Auto-generated</strong>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddKedai(false)}
                className="flex-1 bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700"
              >
                Batal
              </button>
              <button
                onClick={addKedai}
                disabled={
                  saving || !newKedaiNama.trim() || !newKedaiOwnerNama.trim()
                }
                className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Cipta Kedai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Creds */}
      {generatedCreds && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-green-500/30">
            <div className="text-4xl text-center mb-3">🎉</div>
            <h3 className="text-white font-bold text-lg text-center mb-2">
              Kedai Berjaya Dicipta!
            </h3>
            <p className="text-purple-400 text-sm text-center mb-6">
              Hantar credentials ni kepada owner
            </p>
            <div className="bg-[#0f0a1e] border border-purple-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center py-2 border-b border-purple-900/50">
                <span className="text-purple-400 text-xs">Nama Kedai</span>
                <span className="text-white text-sm font-bold">
                  {generatedCreds.kedaiNama}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-purple-900/50">
                <span className="text-purple-400 text-xs">Username</span>
                <span className="text-white text-sm font-mono font-bold">
                  {generatedCreds.username}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-purple-400 text-xs">Password</span>
                <span className="text-white text-sm font-mono font-bold">
                  {generatedCreds.password}
                </span>
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
              <div className="text-green-400 text-xs font-bold mb-1">
                📋 Mesej untuk Owner
              </div>
              <div className="text-green-300 text-xs leading-relaxed">
                Selamat datang ke UrusPOS! 🎉{"\n"}Kedai:{" "}
                {generatedCreds.kedaiNama}
                {"\n"}Username: {generatedCreds.username}
                {"\n"}Password: {generatedCreds.password}
                {"\n"}Login: uruspos.vercel.app
              </div>
            </div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `Selamat datang ke UrusPOS! 🎉\nKedai: ${generatedCreds.kedaiNama}\nUsername: ${generatedCreds.username}\nPassword: ${generatedCreds.password}\nLogin: uruspos.vercel.app`,
                )
              }
              className="w-full bg-purple-700 text-white font-bold py-3 rounded-xl mb-3 text-sm"
            >
              📋 Copy Mesej WhatsApp
            </button>
            <button
              onClick={() => setGeneratedCreds(null)}
              className="w-full bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700 text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* View Credentials */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div
            className="bg-[#1a0e35] rounded-2xl p-6 w-full max-w-sm border border-blue-500/30"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">🔑 Credentials</h3>
              <button
                onClick={() => setShowCredentials(null)}
                className="text-purple-400 text-xl"
              >
                ✕
              </button>
            </div>
            {loadingCreds ? (
              <div className="text-center text-purple-400 py-6">Loading...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {credentialsList.map((user, i) => (
                  <div
                    key={i}
                    className="bg-[#0f0a1e] border border-purple-900/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-sm font-bold">
                        {user.nama}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${user.role === "owner" ? "bg-purple-500/20 text-purple-300" : user.role === "staff" ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-purple-400 text-xs">
                          Username
                        </span>
                        <span className="text-white text-xs font-mono font-bold">
                          {user.username}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-400 text-xs">
                          Password
                        </span>
                        <span className="text-white text-xs font-mono font-bold">
                          {user.password || "abc123"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-400 text-xs">Status</span>
                        <span
                          className={`text-xs font-bold ${user.is_active ? "text-green-400" : "text-red-400"}`}
                        >
                          {user.is_active ? "✓ Aktif" : "✗ Tidak Aktif"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {credentialsList.length === 0 && (
                  <div className="text-center text-purple-400 py-6 text-sm">
                    Tiada user untuk kedai ini.
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowCredentials(null)}
              className="w-full bg-purple-900/50 text-purple-300 font-bold py-3 rounded-xl border border-purple-700 mt-5 text-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes filterSheetUp {
          from {
            transform: translateY(100%);
            opacity: 0.6;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
