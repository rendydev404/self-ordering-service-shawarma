'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Minus, Sandwich, ShoppingCart, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/store/cart'
import { formatRupiah } from '@/lib/validations'
import RecommendationStrip from '@/components/RecommendationStrip'
import type { MenuItem } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)
  const { addItem } = useCart()

  const [item, setItem] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('menu_items')
      .select('*, categories(id,name,sort_order)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setItem(data as MenuItem | null); setLoading(false) })
  }, [id])

  function handleAdd() {
    if (!item) return
    for (let i = 0; i < qty; i++) addItem(item)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FFFBF5] px-4">
        <p className="text-gray-500 font-medium">Produk tidak ditemukan</p>
        <Link href="/" className="btn-primary">Kembali ke Menu</Link>
      </div>
    )
  }

  const showPlaceholder = !item.image_url

  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="font-bold text-gray-900 leading-none truncate">{item.name}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 space-y-6">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100">
          {!showPlaceholder ? (
            <Image src={item.image_url!} alt={item.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sandwich className="w-20 h-20 text-amber-200" strokeWidth={1} />
            </div>
          )}
          {!item.is_available && (
            <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center backdrop-blur-[1px]">
              <span className="bg-white/90 text-gray-700 text-sm font-bold px-5 py-2 rounded-full tracking-widest uppercase shadow">Habis</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2">
          {item.categories?.name && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md">
              {item.categories.name}
            </span>
          )}
          <h2 className="text-2xl font-black text-gray-900">{item.name}</h2>
          {item.description && <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>}
          <p className="text-2xl font-extrabold text-amber-600 pt-1">{formatRupiah(item.price)}</p>
        </div>

        {/* Qty + Add */}
        {item.is_available && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-2 py-1.5">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl flex items-center justify-center transition-colors"
                aria-label="Kurangi"
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <span className="w-8 text-center font-extrabold text-gray-900 tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                disabled={qty >= 10}
                className="w-9 h-9 bg-amber-gradient text-white rounded-xl flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-30"
                aria-label="Tambah"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <button onClick={handleAdd} className="btn-primary flex-1 py-3.5">
              <ShoppingCart className="w-4 h-4" />
              Tambah ke Keranjang
            </button>
          </div>
        )}

        {/* Recommendations */}
        <RecommendationStrip productId={item.id} title="Sering dibeli bersama" />
      </div>
    </div>
  )
}
