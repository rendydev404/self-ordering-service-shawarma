'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Sandwich, SearchX, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MenuItem from '@/components/MenuItem'
import CategoryFilter from '@/components/CategoryFilter'
import Cart from '@/components/Cart'
import { useCart } from '@/store/cart'
import { formatRupiah } from '@/lib/validations'
import AttractScreen from '@/components/AttractScreen'
import type { MenuItem as MenuItemType, Category } from '@/types'

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const { totalItems, totalPrice, isOpen, toggleCart, clearCart, closeCart } = useCart()
  const [isIdle, setIsIdle] = useState(true)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [items_result, cats_result, setting_result] = await Promise.all([
        supabase.from('menu_items').select('*, categories(id,name,sort_order)').order('sort_order'),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('kiosk_settings').select('value').eq('key', 'cover_image_url').single(),
      ])
      setMenuItems(items_result.data ?? [])
      setCategories(cats_result.data ?? [])
      setCoverUrl(setting_result?.data?.value ?? null)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Reset idle countdown when user returns to this page (from detail/checkout)
  useEffect(() => {
    const handleFocus = () => setIsIdle(false)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    if (isIdle) return

    const IDLE_MS = 15_000
    let timer: ReturnType<typeof setTimeout>

    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        clearCart()
        closeCart()
        setIsIdle(true)
      }, IDLE_MS)
    }

    const events = ['click', 'touchstart', 'mousemove', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [isIdle, clearCart, closeCart])

  const filtered =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((m) => m.category_id === selectedCategory)

  const count = totalItems()
  const total = totalPrice()

  return (
    <div className="min-h-screen bg-[#FFFBF5]">

      {/* ── Header ──────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-hero-gradient shadow-2xl">
        {/* Subtle top accent line */}
        <div className="h-0.5 bg-amber-gradient opacity-70" />

        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-gradient rounded-2xl flex items-center justify-center shadow-amber">
              <Sandwich className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-lg tracking-tight leading-none">
                SHAWARMA
              </h1>
              <p className="text-amber-400/80 text-[10px] font-medium tracking-[.15em] uppercase leading-none mt-0.5">
                Self-Ordering Kiosk
              </p>
            </div>
          </div>

          {/* Cart button */}
          {count > 0 ? (
            <button
              onClick={toggleCart}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/15
                border border-white/10 backdrop-blur-sm
                text-white font-semibold px-4 py-2.5 rounded-2xl
                transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 text-white
                  text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {count}
                </span>
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-white/60 text-[10px]">{count} item</span>
                <span className="text-sm font-bold">{formatRupiah(total)}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 hidden sm:block" />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">Keranjang kosong</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-5 py-6 flex gap-6">

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* Category filter */}
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />

          {/* Menu grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-amber-50 animate-pulse h-64" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <SearchX className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-gray-500">Tidak ada menu di kategori ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item, i) => (
                <div
                  key={item.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                >
                  <MenuItem item={item} />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Cart — desktop sidebar */}
        <aside className="hidden lg:block w-[320px] flex-shrink-0">
          <div className="card sticky top-[88px] max-h-[calc(100vh-104px)] flex flex-col overflow-hidden shadow-soft">
            <Cart />
          </div>
        </aside>
      </div>

      {/* ── Mobile cart overlay ──────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={toggleCart}>
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in" />
          <div
            className="absolute right-0 top-0 h-full w-[320px] max-w-[90vw] bg-white
              flex flex-col shadow-2xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Cart />
          </div>
        </div>
      )}

      {/* ── Mobile cart bottom bar ───────────────── */}
      {count > 0 && !isOpen && (
        <div className="fixed bottom-4 left-4 right-4 lg:hidden z-30">
          <button
            onClick={toggleCart}
            className="w-full bg-hero-gradient text-white rounded-3xl px-5 py-4
              flex items-center shadow-2xl border border-white/10
              hover:brightness-110 active:scale-[.98] transition-all"
          >
            <div className="relative mr-3">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-4.5 h-4.5 bg-amber-400 text-white
                text-[9px] font-extrabold rounded-full flex items-center justify-center w-4 h-4">
                {count}
              </span>
            </div>
            <span className="font-semibold flex-1 text-left">Lihat Pesanan</span>
            <span className="font-extrabold text-amber-300">{formatRupiah(total)}</span>
            <ChevronRight className="w-4 h-4 text-white/50 ml-2" />
          </button>
        </div>
      )}

      {/* Bottom padding on mobile so content isn't hidden behind bar */}
      {count > 0 && <div className="h-24 lg:hidden" />}

      {isIdle && (
        <AttractScreen
          onStart={() => setIsIdle(false)}
          coverUrl={coverUrl}
        />
      )}
    </div>
  )
}
