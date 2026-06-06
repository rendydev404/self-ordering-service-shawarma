'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  RefreshCw, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
  Banknote, ShoppingBag, Bell, Search, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/validations'
import type { OrderWithItems, OrderStatus } from '@/types'

const DING_SOUND = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' 

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpand] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Audio state
  const [audioPermission, setAudioPermission] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrderCountRef = useRef<number>(0)

  const supabase = createClient()

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(DING_SOUND)
    audioRef.current.volume = 1.0
  }, [])

  const playNotification = useCallback(async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        await audioRef.current.play()
      }
    } catch (err) {
      console.warn('Audio blocked', err)
      setAudioPermission(false)
    }
  }, [])

  // Fetch data
  const fetchOrders = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(200)
      
    if (data) {
      setOrders(data)
      setLoading(false)

      // Check if there's a NEW pending order
      const currentPendingCount = data.filter(o => o.status === 'pending').length
      if (currentPendingCount > previousOrderCountRef.current && audioPermission) {
        playNotification()
      }
      previousOrderCountRef.current = currentPendingCount
    }
  }, [supabase, playNotification, audioPermission])

  // Short polling fallback + initial fetch
  useEffect(() => {
    fetchOrders()
    // Polling setiap 3 detik (Bypass jika Supabase Realtime di dashboard mati)
    const interval = setInterval(fetchOrders, 3000)

    // Real-time subscription (jika aktif)
    const channel = supabase
      .channel('orders_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, supabase])

  // Mark as completed (Lunas) dengan Optimistic Update (Instan tanpa delay)
  async function markAsPaid(id: string) {
    // 1. Update UI secara INSTAN (Optimistic)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o))
    
    // 2. Background update ke Database
    await supabase.from('orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id)
    fetchOrders()
  }

  // Cancel order dengan Optimistic Update
  async function cancelOrder(id: string) {
    if (confirm('Batalkan pesanan ini secara permanen?')) {
      // 1. Update UI secara INSTAN
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
      
      // 2. Background update
      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
      fetchOrders()
    }
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  
  const completedOrders = orders.filter((o) => o.status === 'completed')
  const filteredCompletedOrders = completedOrders.filter(o => {
    if (!searchQuery) return true
    return o.order_number.toString().includes(searchQuery)
  })

  const todayRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <div className="space-y-6 relative min-h-screen">
      
      {/* Tombol izin suara */}
      {!audioPermission && (
        <button 
          onClick={() => {
            setAudioPermission(true)
            playNotification() // Unlock audio
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold hover:bg-gray-800 transition-all animate-bounce"
        >
          <Bell className="w-5 h-5 text-amber-400" />
          Aktifkan Suara Pesanan Masuk
        </button>
      )}

      {/* ── Header & Stats ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kasir Live</h1>
          <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Koneksi Real-time Aktif
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-amber-50 border border-amber-100 px-5 py-3 rounded-2xl flex-1 sm:flex-none flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-200">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest leading-none">Pendapatan Lunas</p>
              <p className="text-xl font-black text-amber-700 mt-1 leading-none">{formatRupiah(todayRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pb-20">
        
        {/* ── Column: PENDING (Menunggu Pembayaran) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-gray-900 text-lg">Menunggu Pembayaran</h2>
            </div>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
              {pendingOrders.length} Pesanan
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="card h-32 animate-pulse bg-gray-50" />
            ) : pendingOrders.length === 0 ? (
              <div className="card p-12 flex flex-col items-center text-center border-dashed border-2 border-gray-200 bg-transparent shadow-none">
                <ShoppingBag className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
                <p className="font-bold text-gray-400">Tidak ada pesanan tertunda</p>
                <p className="text-xs text-gray-400 mt-1">Pesanan baru akan muncul otomatis di sini.</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const expanded = expandedId === order.id
                return (
                  <div key={order.id} className="card overflow-hidden border-2 border-amber-100 shadow-soft animate-fade-in">
                    {/* Header Row */}
                    <div 
                      className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/30 transition-colors"
                      onClick={() => setExpand(expanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex flex-col items-center justify-center shadow-md shadow-amber-200 flex-shrink-0">
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider leading-none mb-0.5">Antrian</span>
                          <span className="font-black text-white text-xl leading-none">#{order.order_number}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {formatRupiah(order.total_amount)}
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                              {order.payment_method}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} 
                            {' · '}{order.order_items.length} item
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="px-5 pb-4 pt-1 flex gap-2">
                      {order.payment_method === 'qris' ? (
                        <div className="flex-1 bg-blue-50/70 text-blue-600 font-bold py-3.5 rounded-xl border border-blue-100 flex items-center justify-center gap-2 cursor-wait">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Menunggu QRIS Otomatis...</span>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAsPaid(order.id) }}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Tandai Lunas & Selesai
                        </button>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    {expanded && (
                      <div className="border-t border-amber-100/50 bg-amber-50/20 px-5 py-4 space-y-3">
                        <div className="space-y-1.5">
                          {order.order_items.map((oi) => (
                            <div key={oi.id} className="flex justify-between text-sm items-center">
                              <span className="text-gray-700 flex items-center gap-2.5">
                                <span className="w-5 h-5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md flex items-center justify-center">
                                  {oi.quantity}
                                </span>
                                {oi.menu_item_name}
                              </span>
                              <span className="font-semibold text-gray-900">{formatRupiah(oi.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="bg-amber-100/50 border border-amber-200/50 rounded-xl p-3 text-sm text-amber-800">
                            <span className="font-bold">Catatan: </span>{order.notes}
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button 
                            onClick={(e) => { e.stopPropagation(); cancelOrder(order.id) }}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Batalkan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Column: COMPLETED (Selesai Hari Ini) ── */}
        <div className="space-y-4">
          <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-95">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-gray-900 text-lg">Selesai / Lunas</h2>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-colors text-sm"
                placeholder="Cari antrian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Belum ada pesanan selesai hari ini</p>
            ) : filteredCompletedOrders.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Nomor antrian tidak ditemukan</p>
            ) : (
              filteredCompletedOrders.slice(0, 15).map((order) => (
                <div key={order.id} className="card p-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
                  
                  {/* Header Row */}
                  <div className="flex items-start justify-between border-b border-dashed border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center border border-emerald-100 flex-shrink-0">
                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest leading-none mb-0.5">Antrian</span>
                        <span className="font-black text-emerald-700 text-xl leading-none">#{order.order_number}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-none">{formatRupiah(order.total_amount)}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} 
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="uppercase font-bold text-[9px] tracking-wider bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                            {order.payment_method}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Order Items (Readable by laypeople) */}
                  <div className="space-y-1.5">
                    {order.order_items.map((oi) => (
                      <div key={oi.id} className="flex items-start gap-2">
                        <span className="font-black text-gray-900 text-sm w-4 shrink-0 text-right">{oi.quantity}x</span>
                        <span className="text-sm font-medium text-gray-700 leading-snug">{oi.menu_item_name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-3 bg-amber-50 rounded-lg p-2.5 text-xs text-amber-800 font-medium border border-amber-100">
                      <span className="font-bold">Catatan:</span> {order.notes}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {filteredCompletedOrders.length > 15 && (
              <p className="text-center text-xs font-medium text-gray-400 py-2">
                Menampilkan 15 pesanan terakhir (+{filteredCompletedOrders.length - 15} lainnya)
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
