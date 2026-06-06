'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, ShoppingBag, Banknote,
  Calendar, ChevronDown, Award, Clock, CreditCard, QrCode,
  Package, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/validations'

interface OrderRow {
  id: string
  order_number: number
  status: string
  payment_method: string | null
  total_amount: number
  created_at: string
  order_items: {
    id: string
    menu_item_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
}

type DateRange = 'today' | '7days' | '30days' | 'all'

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hari Ini',
  '7days': '7 Hari Terakhir',
  '30days': '30 Hari Terakhir',
  all: 'Semua Waktu',
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('today')
  const [showRangePicker, setShowRangePicker] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let q = supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['completed', 'pending'])
      .order('created_at', { ascending: false })

    if (range === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      q = q.gte('created_at', today.toISOString())
    } else if (range === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      d.setHours(0, 0, 0, 0)
      q = q.gte('created_at', d.toISOString())
    } else if (range === '30days') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      d.setHours(0, 0, 0, 0)
      q = q.gte('created_at', d.toISOString())
    }

    const { data } = await q
    setOrders(data ?? [])
    setLoading(false)
  }, [range])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ─── Derived Analytics ───
  const analytics = useMemo(() => {
    const completed = orders.filter(o => o.status === 'completed')
    const totalRevenue = completed.reduce((s, o) => s + o.total_amount, 0)
    const totalOrders = completed.length
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; revenue: number }> = {}
    completed.forEach(o => {
      const method = o.payment_method || 'unknown'
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, revenue: 0 }
      paymentBreakdown[method].count++
      paymentBreakdown[method].revenue += o.total_amount
    })

    // Best sellers
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    completed.forEach(o => {
      o.order_items.forEach(oi => {
        const key = oi.menu_item_name
        if (!itemMap[key]) itemMap[key] = { name: key, qty: 0, revenue: 0 }
        itemMap[key].qty += oi.quantity
        itemMap[key].revenue += oi.subtotal
      })
    })
    const bestSellers = Object.values(itemMap).sort((a, b) => b.qty - a.qty)

    // Hourly distribution (0-23)
    const hourly = Array(24).fill(0)
    completed.forEach(o => {
      const hour = new Date(o.created_at).getHours()
      hourly[hour]++
    })
    const peakHour = hourly.indexOf(Math.max(...hourly))

    // Daily revenue (for trend chart — last 7 or 30 days)
    const dailyMap: Record<string, number> = {}
    completed.forEach(o => {
      const dateKey = new Date(o.created_at).toISOString().split('T')[0]
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + o.total_amount
    })
    const dailyEntries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0]))

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      paymentBreakdown,
      bestSellers,
      hourly,
      peakHour,
      dailyEntries,
      pendingCount: orders.filter(o => o.status === 'pending').length,
    }
  }, [orders])

  const maxHourly = Math.max(...analytics.hourly, 1)
  const maxDaily = analytics.dailyEntries.length > 0
    ? Math.max(...analytics.dailyEntries.map(e => e[1]), 1)
    : 1

  const PAYMENT_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    cash: { label: 'Tunai', color: '#10b981', bg: 'bg-emerald-50', icon: Banknote },
    qris: { label: 'QRIS', color: '#3b82f6', bg: 'bg-blue-50', icon: QrCode },
    card: { label: 'Kartu', color: '#8b5cf6', bg: 'bg-purple-50', icon: CreditCard },
    unknown: { label: 'Lainnya', color: '#6b7280', bg: 'bg-gray-50', icon: Package },
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-amber-500" />
            Laporan & Analitik
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Insight bisnis Anda secara real-time</p>
        </div>

        {/* Date range picker */}
        <div className="relative">
          <button
            onClick={() => setShowRangePicker(!showRangePicker)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 transition-all shadow-sm"
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            {RANGE_LABELS[range]}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showRangePicker ? 'rotate-180' : ''}`} />
          </button>

          {showRangePicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRangePicker(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 w-48 animate-fade-in">
                {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRange(r); setShowRangePicker(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${range === r ? 'bg-amber-50 text-amber-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="card p-5 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-white col-span-2 md:col-span-1 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                  <Banknote className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
                </div>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Total Pendapatan</p>
                <p className="text-xl font-black mt-0.5 leading-tight">{formatRupiah(analytics.totalRevenue)}</p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="card p-5">
              <div className="w-9 h-9 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <ShoppingBag className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Pesanan</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-0.5">{analytics.totalOrders}</p>
            </div>

            {/* Average Order */}
            <div className="card p-5">
              <div className="w-9 h-9 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rata-rata / Pesanan</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">{formatRupiah(analytics.avgOrderValue)}</p>
            </div>

            {/* Peak Hour */}
            <div className="card p-5">
              <div className="w-9 h-9 bg-purple-50 rounded-2xl flex items-center justify-center mb-3">
                <Clock className="w-4.5 h-4.5 text-purple-500" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jam Tersibuk</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-0.5">
                {analytics.totalOrders > 0 ? `${String(analytics.peakHour).padStart(2, '0')}:00` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Revenue Trend Chart ── */}
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Tren Pendapatan</h2>
                  <p className="text-gray-400 text-xs mt-0.5">Pendapatan harian dalam periode</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {analytics.dailyEntries.length} hari
                </div>
              </div>

              {analytics.dailyEntries.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data untuk ditampilkan
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Bar chart */}
                  <div className="flex items-end gap-1 h-48">
                    {analytics.dailyEntries.map(([date, rev]) => {
                      const pct = (rev / maxDaily) * 100
                      const dayLabel = new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
                          {/* Tooltip */}
                          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            {dayLabel}: {formatRupiah(rev)}
                          </div>
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-amber-400 to-amber-300 hover:from-amber-500 hover:to-amber-400 transition-all cursor-pointer min-h-[4px]"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                          <span className="text-[8px] text-gray-400 font-medium truncate w-full text-center leading-tight">
                            {analytics.dailyEntries.length <= 14 ? dayLabel : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Payment Method Breakdown ── */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Metode Pembayaran</h2>
              <p className="text-gray-400 text-xs mb-5">Distribusi berdasarkan transaksi</p>

              {Object.keys(analytics.paymentBreakdown).length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Donut-like progress bars */}
                  {Object.entries(analytics.paymentBreakdown)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([method, data]) => {
                      const meta = PAYMENT_META[method] || PAYMENT_META.unknown
                      const Icon = meta.icon
                      const pct = analytics.totalOrders > 0 ? Math.round((data.count / analytics.totalOrders) * 100) : 0
                      return (
                        <div key={method}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 ${meta.bg} rounded-xl flex items-center justify-center`}>
                                <Icon className="w-4 h-4" style={{ color: meta.color }} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{meta.label}</p>
                                <p className="text-[10px] text-gray-400">{data.count} pesanan</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-gray-900">{pct}%</p>
                              <p className="text-[10px] text-gray-400">{formatRupiah(data.revenue)}</p>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: meta.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Best Sellers ── */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Award className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-gray-900 text-lg">Produk Terlaris</h2>
              </div>

              {analytics.bestSellers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Belum ada data penjualan</div>
              ) : (
                <div className="space-y-3">
                  {analytics.bestSellers.slice(0, 8).map((item, idx) => {
                    const maxQty = analytics.bestSellers[0].qty
                    const pct = (item.qty / maxQty) * 100
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div key={item.name} className="group">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="w-6 text-center text-sm">
                            {idx < 3 ? medals[idx] : <span className="text-gray-400 font-bold text-xs">#{idx + 1}</span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-500 font-medium">{item.qty} terjual</span>
                                <span className="text-xs font-bold text-gray-900">{formatRupiah(item.revenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Hourly Distribution ── */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-purple-500" />
                <h2 className="font-bold text-gray-900 text-lg">Distribusi Per Jam</h2>
              </div>

              <div className="flex items-end gap-[3px] h-40">
                {analytics.hourly.map((count, hour) => {
                  const pct = (count / maxHourly) * 100
                  const isActive = hour >= 8 && hour <= 22 // business hours highlight
                  const isPeak = hour === analytics.peakHour && count > 0
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {String(hour).padStart(2, '0')}:00 — {count} pesanan
                      </div>
                      <div
                        className={`w-full rounded-t-md transition-all cursor-pointer min-h-[2px]
                          ${isPeak
                            ? 'bg-gradient-to-t from-purple-500 to-purple-400'
                            : isActive
                              ? 'bg-gradient-to-t from-purple-300 to-purple-200 hover:from-purple-400 hover:to-purple-300'
                              : 'bg-gray-200 hover:bg-gray-300'}`}
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Hour labels */}
              <div className="flex gap-[3px] mt-1">
                {analytics.hourly.map((_, hour) => (
                  <div key={hour} className="flex-1 text-center">
                    <span className="text-[7px] text-gray-400 font-medium">
                      {hour % 3 === 0 ? `${String(hour).padStart(2, '0')}` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {analytics.totalOrders > 0 && (
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                    <span>Jam tersibuk ({String(analytics.peakHour).padStart(2, '0')}:00)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-purple-200 rounded-sm" />
                    <span>Jam operasional</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
