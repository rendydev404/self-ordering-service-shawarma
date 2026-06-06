'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, ClipboardList, ChevronDown, ChevronUp,
  Clock, CheckCircle2, ChefHat, Banknote, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/validations'
import type { OrderWithItems, OrderStatus } from '@/types'

const STATUS_CONF: Partial<Record<OrderStatus, {
  label: string; color: string; badge: string; icon: React.ElementType
}>> = {
  pending:   { label: 'Menunggu',     color: 'text-yellow-600',  badge: 'badge-yellow', icon: Clock },
  completed: { label: 'Selesai',      color: 'text-gray-400',    badge: 'badge-gray',   icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan',   color: 'text-red-500',     badge: 'badge-red',    icon: XCircle },
}

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending:   'completed',
}

const STATUS_NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending:   'Tandai Selesai',
}

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState<OrderWithItems[]>([])
  const [filter, setFilter]     = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading]   = useState(true)
  const [expandedId, setExpand] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
    const q = supabase.from('orders').select('*, order_items(*)')
      .order('created_at', { ascending: false }).limit(100)
    if (filter !== 'all') q.eq('status', filter)
    const { data } = await q
    setOrders(data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchOrders()
    const iv = setInterval(fetchOrders, 15000)
    return () => clearInterval(iv)
  }, [fetchOrders])

  async function updateStatus(id: string, status: OrderStatus) {
    const supabase = createClient()
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchOrders()
  }

  const todayRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.total_amount, 0)

  const statCards = [
    { status: 'pending' as OrderStatus,   label: 'Menunggu',   icon: Clock },
    { status: 'completed' as OrderStatus, label: 'Selesai',    icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-6">

      {/* ── Page title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Pesanan</h1>
          <p className="text-gray-400 text-sm mt-0.5">Auto-refresh setiap 15 detik</p>
        </div>
        <button
          onClick={fetchOrders}
          className="btn-secondary py-2 px-4 text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ status, label, icon: Icon }) => {
          const count = orders.filter((o) => o.status === status).length
          const active = filter === status
          const conf = STATUS_CONF[status]!
          return (
            <button
              key={status}
              onClick={() => setFilter(active ? 'all' : status)}
              className={`card p-5 text-left transition-all hover:shadow-card-hover hover:-translate-y-0.5
                ${active ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-3
                ${active ? 'bg-amber-gradient' : 'bg-gray-100'}`}>
                <Icon className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-gray-400'}`} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
              <p className={`text-3xl font-extrabold mt-0.5 ${conf.color}`}>{count}</p>
            </button>
          )
        })}

        {/* Revenue card */}
        <div className="card p-5 bg-amber-gradient text-white col-span-2 md:col-span-1">
          <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <Banknote className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-xs font-semibold text-amber-100/80 uppercase tracking-widest">Revenue Hari Ini</p>
          <p className="text-xl font-extrabold mt-0.5 leading-tight">{formatRupiah(todayRevenue)}</p>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 flex-wrap items-center">
        {(['all', ...Object.keys(STATUS_CONF)] as (OrderStatus | 'all')[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all
              ${filter === s
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
          >
            {s === 'all' ? 'Semua Pesanan' : STATUS_CONF[s as keyof typeof STATUS_CONF]?.label}
          </button>
        ))}
      </div>

      {/* ── Order list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-14 flex flex-col items-center text-center text-gray-400">
          <ClipboardList className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1} />
          <p className="font-semibold text-gray-500">Belum ada pesanan</p>
          <p className="text-sm mt-1">
            {filter !== 'all' ? 'Tidak ada pesanan dengan status ini' : 'Pesanan akan muncul di sini'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            const conf = STATUS_CONF[order.status as OrderStatus] || { label: order.status, color: 'text-gray-500', badge: 'badge-gray', icon: Clock }
            const Icon = conf.icon
            const expanded = expandedId === order.id
            return (
              <div key={order.id} className="card overflow-hidden transition-shadow hover:shadow-card-hover">

                {/* Row header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                  onClick={() => setExpand(expanded ? null : order.id)}
                >
                  {/* Order number */}
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="font-extrabold text-amber-600 text-sm leading-none">
                      #{order.order_number}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`${conf.badge} flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {conf.label}
                      </span>
                      {order.customer_name && (
                        <span className="text-sm font-semibold text-gray-700">{order.customer_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                      {' · '}{order.order_items.length} item
                    </p>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-extrabold text-gray-900 flex items-center gap-2 justify-end">
                        {formatRupiah(order.total_amount)}
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                          {order.payment_method}
                        </span>
                      </p>
                    </div>
                    <div className="w-7 h-7 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                      {expanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-4 animate-fade-in">

                    {/* Items */}
                    <div className="grid gap-1.5">
                      {order.order_items.map((oi) => (
                        <div key={oi.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-700 text-[10px] font-bold
                              rounded-md flex items-center justify-center flex-shrink-0">
                              {oi.quantity}
                            </span>
                            {oi.menu_item_name}
                          </span>
                          <span className="font-semibold text-gray-900">{formatRupiah(oi.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-800">
                        <span className="font-semibold">Catatan: </span>{order.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_NEXT[order.status as OrderStatus] && (
                        <button
                          onClick={() => updateStatus(order.id, STATUS_NEXT[order.status as OrderStatus]!)}
                          className="btn-primary py-2 px-5 text-sm"
                        >
                          {STATUS_NEXT_LABEL[order.status as OrderStatus]}
                        </button>
                      )}
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => { if (confirm('Batalkan pesanan ini?')) updateStatus(order.id, 'cancelled') }}
                          className="btn-danger py-2 px-4 text-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
