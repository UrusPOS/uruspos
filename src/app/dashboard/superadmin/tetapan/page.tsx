'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Kedai = {
  id: string
  nama: string
  font_size: number
  bahasa: string | null
}

export default function TetapanPage() {
  const [kedaiList, setKedaiList] = useState<Kedai[]>([])
  const [bahasaGlobal, setBahasaGlobal] = useState('BM')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: kedais }, { data: tetapan }] = await Promise.all([
      supabase.from('kedai').select('id, nama, font_size, bahasa').order('nama'),
      supabase.from('sistem_tetapan').select('nilai').eq('kunci', 'bahasa_global').single()
    ])
    if (kedais) setKedaiList(kedais)
    if (tetapan) setBahasaGlobal(tetapan.nilai)
  }

  function updateKedai(id: string, field: keyof Kedai, value: any) {
    setKedaiList(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
  }

  async function simpan() {
    setSaving(true)
    await supabase.from('sistem_tetapan')
      .upsert({ kunci: 'bahasa_global', nilai: bahasaGlobal, updated_at: new Date().toISOString() }, { onConflict: 'kunci' })

    await Promise.all(kedaiList.map(k =>
      supabase.from('kedai').update({ font_size: k.font_size, bahasa: k.bahasa }).eq('id', k.id)
    ))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-xl font-semibold">Tetapan Sistem</h1>

      {/* Bahasa Global */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-medium mb-4">Bahasa Sistem</h2>
        <p className="text-sm text-gray-500 mb-2">Lalai global</p>
        <div className="flex gap-2 mb-6">
          {['BM', 'EN'].map(lang => (
            <button key={lang}
              onClick={() => setBahasaGlobal(lang)}
              className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${bahasaGlobal === lang ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {lang}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-3">Override per kedai</p>
        <div className="space-y-3">
          {kedaiList.map(kedai => {
            const isOverride = kedai.bahasa && kedai.bahasa !== bahasaGlobal
            return (
              <div key={kedai.id} className="flex items-center gap-3">
                <span className="text-sm font-medium w-40 truncate">{kedai.nama}</span>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  {['BM', 'EN'].map(lang => (
                    <button key={lang}
                      onClick={() => updateKedai(kedai.id, 'bahasa', lang === bahasaGlobal ? null : lang)}
                      className={`px-4 py-1.5 text-xs font-medium transition ${(kedai.bahasa ?? bahasaGlobal) === lang ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                      {lang}
                    </button>
                  ))}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md ${isOverride ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                  {isOverride ? `Override: ${kedai.bahasa}` : 'Ikut global'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Font Size Per Kedai */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-medium mb-1">Saiz Teks (Desktop)</h2>
        <p className="text-sm text-gray-500 mb-4">Per kedai, 12px – 18px</p>
        <div className="space-y-4">
          {kedaiList.map(kedai => (
            <div key={kedai.id}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium w-40 truncate">{kedai.nama}</span>
                <input type="range" min={12} max={18} step={1} value={kedai.font_size}
                  onChange={e => updateKedai(kedai.id, 'font_size', Number(e.target.value))}
                  className="flex-1" />
                <span className="text-sm text-gray-500 w-10 text-right">{kedai.font_size}px</span>
              </div>
              <div className="ml-44 mt-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 transition-all"
                style={{ fontSize: kedai.font_size }}>
                Jualan hari ini: RM 1,240.00
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={simpan} disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan tetapan'}
        </button>
      </div>
    </div>
  )
}