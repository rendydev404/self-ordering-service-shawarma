'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Monitor, LogOut, Power, Loader2, Wifi, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface KioskPresence {
  userId: string
  username: string
  device_label: string
  online_at: string
}

type Toast = { type: 'success' | 'error'; message: string } | null

export default function KioskControlPanel() {
  const [outletId, setOutletId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [kiosks, setKiosks] = useState<KioskPresence[]>([])
  const [busy, setBusy] = useState<string | null>(null) // userId atau 'all' yang sedang diproses
  const [toast, setToast] = useState<Toast>(null)
  const [connected, setConnected] = useState(false)
  const [reloadKey, setReloadKey] = useState(0) // increment untuk paksa re-subscribe (tombol Refresh)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Ambil outlet_id kasir yang sedang login
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setReady(true); return }
      const { data: profile } = await supabase.from('profiles').select('outlet_id').eq('id', user.id).single()
      setOutletId(profile?.outlet_id ?? null)
      setReady(true)
    })
  }, [])

  // Subscribe presence channel outlet (read-only — kasir tidak ikut track)
  useEffect(() => {
    if (!outletId) return
    const supabase = createClient()
    const channel = supabase.channel(`kiosk-control:${outletId}`)
    channelRef.current = channel

    const syncList = () => {
      const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>
      const list: KioskPresence[] = Object.entries(state).map(([key, metas]) => {
        const meta = metas[0] ?? {}
        return {
          userId: key,
          username: (meta.username as string) ?? key,
          device_label: (meta.device_label as string) ?? (meta.username as string) ?? 'Kiosk',
          online_at: (meta.online_at as string) ?? '',
        }
      })
      list.sort((a, b) => a.device_label.localeCompare(b.device_label))
      setKiosks(list)
    }

    channel
      .on('presence', { event: 'sync' }, syncList)
      .on('presence', { event: 'join' }, syncList)
      .on('presence', { event: 'leave' }, syncList)
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          syncList()
          // Minta semua kiosk lapor hadir → daftar terisi seketika tanpa refresh kiosk
          channel.send({ type: 'broadcast', event: 'request_presence', payload: {} })
        }
      })

    // Safety net: re-baca presence berkala supaya daftar tak pernah "nyangkut"
    const interval = setInterval(syncList, 4000)

    return () => {
      clearInterval(interval)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [outletId, reloadKey])

  const showToast = useCallback((t: Toast) => {
    setToast(t)
    if (t) setTimeout(() => setToast(null), 3500)
  }, [])

  async function doLogout(target: string, label: string) {
    setBusy(target)
    try {
      const res = await fetch('/api/kiosk/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Gagal me-logout kiosk' })
      } else {
        showToast({ type: 'success', message: `${label} berhasil di-logout` })
      }
    } catch {
      showToast({ type: 'error', message: 'Gagal menghubungi server' })
    } finally {
      setBusy(null)
    }
  }

  function handleLogoutOne(k: KioskPresence) {
    if (confirm(`Logout kiosk "${k.device_label}"? Tablet akan kembali ke halaman login.`)) {
      doLogout(k.userId, k.device_label)
    }
  }

  function handleLogoutAll() {
    if (kiosks.length === 0) return
    if (confirm(`Logout SEMUA ${kiosks.length} kiosk di cabang ini? Semua tablet akan kembali ke login.`)) {
      doLogout('all', 'Semua kiosk')
    }
  }

  function handleRefresh() {
    // Re-baca cepat dari channel saat ini…
    const ch = channelRef.current
    if (ch) {
      // Minta kiosk lapor hadir (broadcast), lalu baca presence terkini
      ch.send({ type: 'broadcast', event: 'request_presence', payload: {} })
      const state = ch.presenceState() as Record<string, Array<Record<string, unknown>>>
      const list: KioskPresence[] = Object.entries(state).map(([key, metas]) => {
        const meta = metas[0] ?? {}
        return {
          userId: key,
          username: (meta.username as string) ?? key,
          device_label: (meta.device_label as string) ?? (meta.username as string) ?? 'Kiosk',
          online_at: (meta.online_at as string) ?? '',
        }
      })
      list.sort((a, b) => a.device_label.localeCompare(b.device_label))
      setKiosks(list)
    }
    // …dan paksa subscribe ulang penuh agar koneksi yang bermasalah dibuat ulang.
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Kontrol Kiosk</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base font-medium flex items-center gap-2">
            Tablet kiosk yang sedang aktif di cabang Anda.
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${connected ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {connected ? 'Terhubung' : 'Menghubungkan…'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
            title="Perbarui daftar kiosk"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleLogoutAll}
            disabled={kiosks.length === 0 || busy !== null}
            className="flex items-center justify-center gap-2 bg-red-500 text-white px-5 py-3 rounded-2xl font-bold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === 'all' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
            Logout Semua Kiosk
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        {!ready ? (
          <p className="text-gray-500 font-medium flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Memuat…
          </p>
        ) : !outletId ? (
          <p className="text-gray-500 font-medium">Akun Anda tidak terhubung ke cabang mana pun.</p>
        ) : kiosks.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <Monitor className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
            <p className="font-bold text-gray-400">Tidak ada kiosk online</p>
            <p className="text-xs text-gray-400 mt-1">Tablet kiosk yang menyala akan muncul otomatis di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kiosks.map((k) => (
              <div key={k.userId} className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 relative">
                    <Monitor className="w-5 h-5 text-emerald-600" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{k.device_label}</p>
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> Online
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleLogoutOne(k)}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-3.5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 shrink-0"
                >
                  {busy === k.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Logout
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm animate-fade-up ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
