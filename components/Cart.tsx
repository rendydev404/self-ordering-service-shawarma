'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Trash2, X, ArrowRight } from 'lucide-react'
import { useCart } from '@/store/cart'
import { formatRupiah } from '@/lib/validations'
import RecommendationStrip from '@/components/RecommendationStrip'

export default function Cart() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, totalItems, totalPrice, closeCart } = useCart()
  const total = totalPrice()
  const count = totalItems()

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <CartHeader count={0} onClose={closeCart} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-9 h-9 text-amber-200" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-gray-700">Keranjang Kosong</p>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Pilih menu favoritmu untuk mulai memesan
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <CartHeader count={count} onClose={closeCart} />

      {/* Items + recommendations (scroll together so footer stays pinned) */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        <div className="space-y-1">
        {items.map(({ item, quantity }) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {item.name}
              </p>
              <p className="text-amber-600 text-xs font-semibold mt-0.5">
                {formatRupiah(item.price)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="w-6 h-6 bg-gray-100 hover:bg-amber-100 text-gray-500 hover:text-amber-700
                  rounded-lg flex items-center justify-center transition-colors"
              >
                <Minus className="w-3 h-3" strokeWidth={2.5} />
              </button>
              <span className="w-6 text-center font-bold text-gray-900 text-sm tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, quantity + 1)}
                disabled={quantity >= 10}
                className="w-6 h-6 bg-amber-100 hover:bg-amber-500 text-amber-600 hover:text-white
                  rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="w-6 h-6 text-gray-200 hover:text-red-400 rounded-lg
                  flex items-center justify-center transition-colors ml-1 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        </div>

        {/* Recommendations */}
        <div className="pt-3 border-t border-gray-50">
          <RecommendationStrip
            cartIds={items.map((i) => i.item.id)}
            title="Lengkapi pesananmu"
            limit={3}
            variant="list"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 pt-4 pb-5 space-y-4 bg-white">
        {/* Total breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{count} item</span>
            <span>{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total Pembayaran</span>
            <span className="font-extrabold text-xl text-amber-600">{formatRupiah(total)}</span>
          </div>
        </div>

        <button
          onClick={() => { closeCart(); router.push('/checkout') }}
          className="btn-primary w-full py-3.5 text-base"
        >
          Pesan Sekarang
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function CartHeader({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-amber-gradient rounded-xl flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 leading-none">Pesananmu</h2>
          {count > 0 && (
            <p className="text-amber-600 text-xs font-semibold mt-0.5">{count} item dipilih</p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="lg:hidden w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200
          flex items-center justify-center text-gray-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
