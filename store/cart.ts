'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MenuItem, CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: MenuItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  closeCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.item.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.item.id === item.id
                  ? { ...i, quantity: Math.min(i.quantity + 1, 10) }
                  : i
              ),
            }
          }
          return { items: [...state.items, { item, quantity: 1 }] }
        }),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.item.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.item.id !== itemId) }
          }
          return {
            items: state.items.map((i) =>
              i.item.id === itemId ? { ...i, quantity: Math.min(quantity, 10) } : i
            ),
          }
        }),

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      closeCart: () => set({ isOpen: false }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.item.price * i.quantity, 0),
    }),
    {
      name: 'shawarma-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
