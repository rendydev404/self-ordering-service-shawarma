'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus, Sandwich } from 'lucide-react'
import type { MenuItem as MenuItemType } from '@/types'
import { useCart } from '@/store/cart'
import { formatRupiah } from '@/lib/validations'

interface Props {
  item: MenuItemType
}

export default function MenuItem({ item }: Props) {
  const { items, addItem, updateQuantity } = useCart()
  const [imgError, setImgError] = useState(false)
  const cartItem = items.find((i) => i.item.id === item.id)
  const quantity = cartItem?.quantity ?? 0
  const showPlaceholder = !item.image_url || imgError

  return (
    <div
      onClick={() => {
        if (item.is_available) addItem(item)
      }}
      className={`group bg-white rounded-3xl overflow-hidden border border-gray-100
        shadow-card hover:shadow-card-hover hover:-translate-y-1
        transition-all duration-250 flex flex-col cursor-pointer
        ${!item.is_available ? 'opacity-55 !cursor-not-allowed' : ''}`}
    >
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-amber-50 via-amber-100 to-orange-100 overflow-hidden flex-shrink-0">
        {!showPlaceholder ? (
          <Image
            src={item.image_url!}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sandwich className="w-16 h-16 text-amber-200" strokeWidth={1} />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        {!showPlaceholder && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
        )}

        {/* "Habis" overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-white/90 text-gray-700 text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase shadow">
              Habis
            </span>
          </div>
        )}

        {/* Quantity badge (when in cart) */}
        {quantity > 0 && (
          <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-amber-500 text-white text-xs font-extrabold rounded-full flex items-center justify-center shadow-lg animate-scale-in">
            {quantity}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed flex-1">
            {item.description}
          </p>
        )}

        {/* Price + Controls */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <span className="font-extrabold text-amber-600 text-base leading-none">
              {formatRupiah(item.price)}
            </span>
          </div>

          {item.is_available && (
            quantity === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addItem(item)
                }}
                aria-label={`Tambah ${item.name}`}
                className="w-9 h-9 bg-amber-gradient text-white rounded-2xl flex items-center justify-center
                  shadow-amber hover:brightness-110 active:scale-95 transition-all duration-150"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateQuantity(item.id, quantity - 1)
                  }}
                  className="w-7 h-7 bg-amber-100 hover:bg-amber-200 text-amber-700
                    rounded-xl flex items-center justify-center transition-colors"
                  aria-label="Kurangi"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <span className="w-6 text-center font-extrabold text-gray-900 text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addItem(item)
                  }}
                  className="w-7 h-7 bg-amber-gradient text-white rounded-xl
                    flex items-center justify-center transition-all hover:brightness-110"
                  aria-label="Tambah"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
