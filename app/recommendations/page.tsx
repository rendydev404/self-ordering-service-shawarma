'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sandwich, Loader2, ArrowRight } from 'lucide-react'
import { useCart } from '@/store/cart'
import type { MenuItem } from '@/types'
import { formatRupiah } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'

export default function RecommendationsPage() {
  const router = useRouter()
  const { items: cartItems, addItem } = useCart()
  const [recommendations, setRecommendations] = useState<MenuItem[]>([])
  const [upsellItems, setUpsellItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Track selected items: { [menuId]: { note: string, upsells: Record<string, number> } }
  const [selectedItems, setSelectedItems] = useState<Record<string, { note: string, upsells: Record<string, number> }>>({})

  useEffect(() => {
    if (cartItems.length === 0) {
      router.replace('/')
      return
    }

    async function initData() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      
      const { data: profile } = await supabase.from('profiles').select('outlet_id').eq('id', user.id).single()
      const currentOutletId = profile?.outlet_id || '11111111-1111-1111-1111-111111111111'

      const { data: settings } = await supabase
        .from('kiosk_settings')
        .select('key, value')
        .eq('outlet_id', currentOutletId)
        .in('key', ['upsell_ids', 'unavailable_menu_ids', 'recommendation_ids'])

      let unavIds: string[] = []
      let upIds: string[] = []
      let recIds: string[] = []
      
      settings?.forEach(s => {
        if (s.key === 'unavailable_menu_ids' && s.value) {
          try { unavIds = JSON.parse(s.value) } catch {}
        }
        if (s.key === 'upsell_ids' && s.value) {
          try { upIds = JSON.parse(s.value) } catch {}
        }
        if (s.key === 'recommendation_ids' && s.value) {
          try { recIds = JSON.parse(s.value) } catch {}
        }
      })

      const cartIdSet = new Set(cartItems.map(c => c.item.id))
      let recs: MenuItem[] = []

      // If Kasir has manually set recommendations, use them. Otherwise fallback to API.
      if (recIds.length > 0) {
        const { data: mItems } = await supabase
          .from('menu_items')
          .select('*')
          .in('id', recIds)
          .eq('is_available', true)
          
        recs = (mItems || []).filter(m => !cartIdSet.has(m.id))
      } else {
        const cartIds = cartItems.map(c => c.item.id).join(',')
        try {
          const res = await fetch(`/api/recommendations?cart=${cartIds}&limit=5`)
          const data = await res.json()
          recs = (data.items || []).filter((m: MenuItem) => !cartIdSet.has(m.id))
        } catch {}
      }

      // Filter recommendations availability based on outlet setting
      const finalRecs = recs.filter(m => {
        const isGlobal = m.outlet_id === null
        if (isGlobal && unavIds.includes(m.id)) return false
        return true
      })

      if (finalRecs.length === 0) {
        router.replace('/checkout')
        return
      }

      setRecommendations(finalRecs)

      // Fetch upsell items
      if (upIds.length > 0) {
        const { data: uItems } = await supabase
          .from('menu_items')
          .select('*')
          .in('id', upIds)
          .eq('is_available', true)
          
        const filteredUpsells = (uItems || []).filter(u => {
          if (u.outlet_id === null && unavIds.includes(u.id)) return false
          return true
        })
        setUpsellItems(filteredUpsells)
      }

      setLoading(false)
    }

    initData()
  }, [cartItems, router])

  function handleContinue() {
    // Add selected items to cart
    Object.entries(selectedItems).forEach(([uId, data]) => {
      const uItem = recommendations.find(u => u.id === uId)
      if (uItem) {
        // 1. Add recommendation as main item
        const parentId = addItem(uItem, 1, data.note)
        
        // 2. Add selected extras as children
        Object.keys(data.upsells).forEach(upsellId => {
          const extraItem = upsellItems.find(x => x.id === upsellId)
          if (extraItem) {
            addItem(extraItem, 1, '', parentId)
          }
        })
      }
    })
    router.push('/checkout')
  }

  function handleNoThanks() {
    router.push('/checkout')
  }

  function toggleItem(uId: string) {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (next[uId]) {
        delete next[uId]
      } else {
        next[uId] = { note: '', upsells: {} }
      }
      return next
    })
  }

  function updateNote(uId: string, note: string) {
    setSelectedItems(prev => ({
      ...prev,
      [uId]: { ...prev[uId], note }
    }))
  }

  function toggleUpsell(recId: string, upsellId: string) {
    setSelectedItems(prev => {
      if (!prev[recId]) return prev
      const currentUpsells = prev[recId].upsells
      const newUpsells = { ...currentUpsells }
      if (newUpsells[upsellId]) {
        delete newUpsells[upsellId]
      } else {
        newUpsells[upsellId] = 1
      }
      return {
        ...prev,
        [recId]: { ...prev[recId], upsells: newUpsells }
      }
    })
  }

  if (loading) {
    return <div className="min-h-screen bg-[#FFFBF5]" />
  }

  if (recommendations.length === 0) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Penawaran Spesial Sebelum Bayar!
          </div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Sempurnakan Pesananmu!</h1>
          <p className="text-[15px] font-medium text-gray-500">92% pelanggan setuju makanan ini bikin makin puas 🤤</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {recommendations.map(u => {
          const isSelected = !!selectedItems[u.id]

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-card
                ${isSelected ? 'border-amber-400 bg-amber-50/40' : 'border-gray-100'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden relative flex-shrink-0 border border-gray-100/50 shadow-sm">
                  {u.image_url ? (
                    <Image src={u.image_url} alt={u.name} fill className="object-cover" unoptimized/>
                  ) : (
                    <Sandwich className="w-10 h-10 m-auto mt-5 text-gray-300"/>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-[17px] leading-tight truncate">{u.name}</h3>
                  </div>
                  <p className="font-extrabold text-amber-600 mt-0.5 text-base">{formatRupiah(u.price)}</p>
                </div>
                <div className="flex-shrink-0 pl-2">
                  <button 
                    onClick={() => toggleItem(u.id)}
                    className={`font-black px-6 py-2.5 rounded-full text-sm transition-all active:scale-95 shadow-sm
                      ${isSelected 
                        ? 'bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100' 
                        : 'bg-amber-400 text-white border-2 border-amber-400 hover:bg-amber-500 shadow-amber-400/30'}`}
                  >
                    {isSelected ? 'Batal' : 'Mau Ini!'}
                  </button>
                </div>
              </div>

              {/* Note and Upsells if Selected */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-amber-100/50 animate-fade-in space-y-4">
                  <input
                    type="text"
                    value={selectedItems[u.id]?.note || ''}
                    onChange={(e) => updateNote(u.id, e.target.value)}
                    placeholder="Catatan (contoh: ekstra pedas, tanpa bawang...)"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                      transition-all"
                  />

                  {/* Upsells / Extras */}
                  {upsellItems.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm mb-2 px-1">Extra</h4>
                      <div className="space-y-2">
                        {upsellItems.filter(up => up.id !== u.id).map(up => {
                          const isUpsellSelected = !!selectedItems[u.id].upsells[up.id]
                          return (
                            <div key={up.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                              <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden relative flex-shrink-0">
                                {up.image_url ? (
                                  <Image src={up.image_url} alt={up.name} fill className="object-cover" unoptimized/>
                                ) : (
                                  <Sandwich className="w-5 h-5 m-auto mt-2.5 text-gray-300"/>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-gray-900 text-[13px] leading-tight truncate">{up.name}</h5>
                                <p className="font-bold text-amber-600 mt-0.5 text-[12px]">{formatRupiah(up.price)}</p>
                              </div>
                              <div className="flex-shrink-0">
                                {isUpsellSelected ? (
                                  <button 
                                    onClick={() => toggleUpsell(u.id, up.id)}
                                    className="bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg text-[12px] transition-colors active:scale-95"
                                  >
                                    Batal
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => toggleUpsell(u.id, up.id)}
                                    className="bg-gray-50 hover:bg-gray-100 text-gray-900 font-bold px-3 py-1.5 rounded-lg text-[12px] transition-colors active:scale-95"
                                  >
                                    Tambah
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-4 py-5 pb-8 sm:pb-5 z-20">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleNoThanks} 
            className="w-full sm:w-1/3 bg-transparent text-gray-400 hover:text-gray-600 hover:underline font-semibold py-4 transition-all active:scale-[0.98]"
          >
            Nggak, makasih
          </button>
          <button 
            onClick={handleContinue} 
            className="w-full sm:w-2/3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            Lanjut ke Pembayaran
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
