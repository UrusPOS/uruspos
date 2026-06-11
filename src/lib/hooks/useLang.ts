'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Translation strings ───────────────────────────────────────────────────

export const translations = {
  BM: {
    // Nav
    dashboard: 'Papan Pemuka',
    inventori: 'Inventori',
    staff: 'Pengurusan Staf',
    laporan: 'Laporan',
    tetapan: 'Tetapan',
    logout: 'Log Keluar',

    // Dashboard
    jualan_hari_ini: 'Jualan Hari Ini',
    untung_hari_ini: 'Untung Hari Ini',
    margin: 'Margin',
    stok_kritikal: 'Stok Kritikal',
    fee_uruspos: 'Fee UrusPOS (2%)',
    tiada_data: 'Tiada data lagi',

    // POS / Staff
    pilih_meja: 'Pilih Meja',
    meja: 'Meja',
    tambah_ke_cart: 'Tambah',
    hantar_ke_dapur: 'Hantar ke Dapur',
    checkout: 'Checkout',
    tunai: 'Tunai',
    duitnow: 'DuitNow',
    jumlah: 'Jumlah',
    rekod: 'Rekod',
    order_baru: 'Order Baru',

    // Inventori
    nama_produk: 'Nama Produk',
    harga_jual: 'Harga Jual (RM)',
    kos_beli: 'Kos Beli (RM)',
    stok: 'Stok',
    tambah_produk: 'Tambah Produk',
    tambah_stok: 'Tambah Stok',
    padam: 'Padam',
    aktif: 'Aktif',
    nyahaktif: 'Nyahaktif',

    // Staff
    nama: 'Nama',
    username: 'Nama Pengguna',
    password: 'Kata Laluan',
    role: 'Peranan',
    tambah_staff: 'Tambah Staf',

    // Kitchen
    baru_masuk: 'Baru Masuk',
    sedang_disediakan: 'Sedang Disediakan',
    siap: 'Siap',
    tandakan_siap: 'Tandakan Siap',
    minit: 'minit',
    dah_bayar: 'Dah Bayar',

    // Laporan
    laporan_bulanan: 'Laporan Bulanan',
    jualan_kasar: 'Jualan Kasar',
    cogs: 'Kos Barang (COGS)',
    untung_kasar: 'Untung Kasar',
    eksport: 'Eksport',

    // Umum
    simpan: 'Simpan',
    batal: 'Batal',
    tutup: 'Tutup',
    ya: 'Ya',
    tidak: 'Tidak',
    cari: 'Cari',
    semua: 'Semua',
    status: 'Status',
    tindakan: 'Tindakan',
    ikut_global: 'Ikut global',
    override: 'Override',
    saiz_teks: 'Saiz Teks',
    bahasa: 'Bahasa',
  },

  EN: {
    // Nav
    dashboard: 'Dashboard',
    inventori: 'Inventory',
    staff: 'Staff Management',
    laporan: 'Reports',
    tetapan: 'Settings',
    logout: 'Log Out',

    // Dashboard
    jualan_hari_ini: "Today's Sales",
    untung_hari_ini: "Today's Profit",
    margin: 'Margin',
    stok_kritikal: 'Critical Stock',
    fee_uruspos: 'UrusPOS Fee (2%)',
    tiada_data: 'No data yet',

    // POS / Staff
    pilih_meja: 'Select Table',
    meja: 'Table',
    tambah_ke_cart: 'Add',
    hantar_ke_dapur: 'Send to Kitchen',
    checkout: 'Checkout',
    tunai: 'Cash',
    duitnow: 'DuitNow',
    jumlah: 'Total',
    rekod: 'Records',
    order_baru: 'New Order',

    // Inventori
    nama_produk: 'Product Name',
    harga_jual: 'Selling Price (RM)',
    kos_beli: 'Cost Price (RM)',
    stok: 'Stock',
    tambah_produk: 'Add Product',
    tambah_stok: 'Add Stock',
    padam: 'Delete',
    aktif: 'Active',
    nyahaktif: 'Deactivate',

    // Staff
    nama: 'Name',
    username: 'Username',
    password: 'Password',
    role: 'Role',
    tambah_staff: 'Add Staff',

    // Kitchen
    baru_masuk: 'New Orders',
    sedang_disediakan: 'In Progress',
    siap: 'Ready',
    tandakan_siap: 'Mark Ready',
    minit: 'min',
    dah_bayar: 'Paid',

    // Laporan
    laporan_bulanan: 'Monthly Report',
    jualan_kasar: 'Gross Sales',
    cogs: 'Cost of Goods (COGS)',
    untung_kasar: 'Gross Profit',
    eksport: 'Export',

    // Umum
    simpan: 'Save',
    batal: 'Cancel',
    tutup: 'Close',
    ya: 'Yes',
    tidak: 'No',
    cari: 'Search',
    semua: 'All',
    status: 'Status',
    tindakan: 'Actions',
    ikut_global: 'Follow global',
    override: 'Override',
    saiz_teks: 'Text Size',
    bahasa: 'Language',
  },
} as const

export type LangKey = keyof typeof translations
export type TranslationKey = keyof typeof translations.BM

// ─── Cache (avoid refetch on every component mount) ────────────────────────

let cachedLang: LangKey | null = null
let cacheExpiry = 0

async function resolveLang(kedaiId: string | null): Promise<LangKey> {
  const now = Date.now()
  if (cachedLang && now < cacheExpiry) return cachedLang

  // 1. Cuba ambil override kedai dulu
  if (kedaiId) {
    const { data: kedai } = await supabase
      .from('kedai')
      .select('bahasa')
      .eq('id', kedaiId)
      .single()
    if (kedai?.bahasa && (kedai.bahasa === 'BM' || kedai.bahasa === 'EN')) {
      cachedLang = kedai.bahasa
      cacheExpiry = now + 5 * 60 * 1000 // cache 5 minit
      return cachedLang
    }
  }

  // 2. Fallback ke global setting
  const { data: tetapan } = await supabase
    .from('sistem_tetapan')
    .select('nilai')
    .eq('kunci', 'bahasa_global')
    .single()

  cachedLang = (tetapan?.nilai === 'EN' ? 'EN' : 'BM') as LangKey
  cacheExpiry = now + 5 * 60 * 1000
  return cachedLang
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useLang(kedaiId: string | null = null) {
  const [lang, setLang] = useState<LangKey>('BM')

  useEffect(() => {
    resolveLang(kedaiId).then(setLang)
  }, [kedaiId])

  // t('jualan_hari_ini') → "Jualan Hari Ini" atau "Today's Sales"
  function t(key: TranslationKey): string {
    return translations[lang][key]
  }

  return { t, lang }
}

// ─── Util: invalidate cache (panggil lepas simpan tetapan) ─────────────────

export function invalidateLangCache() {
  cachedLang = null
  cacheExpiry = 0
}
