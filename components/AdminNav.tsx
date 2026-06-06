'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ClipboardList, Sandwich, LogOut, LayoutDashboard, Tag, Radio, BarChart3, Settings, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/admin/orders',     label: 'Order', icon: Radio },
  { href: '/admin',            label: 'Histori',   icon: ClipboardList },
  { href: '/admin/reports',    label: 'Laporan',   icon: BarChart3 },
  { href: '/admin/menu',       label: 'Menu',      icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Kategori',  icon: Tag },
  { href: '/admin/settings',   label: 'Settings',  icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <>
      {/* ── Top bar mobile (< md) ── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-gray-950 border-b border-white/5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-gradient rounded-xl flex items-center justify-center shadow-amber">
            <Sandwich className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <p className="text-white font-bold text-sm">SHAWARMA</p>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Backdrop drawer (mobile) ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-auto
          h-screen w-60 shrink-0
          bg-gray-950 border-r border-white/5
          flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/5 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <div className="w-9 h-9 bg-amber-gradient rounded-xl flex items-center justify-center shadow-amber">
              <Sandwich className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">SHAWARMA</p>
              <p className="text-amber-500/70 text-[10px] font-medium uppercase tracking-widest leading-none mt-1">
                Admin
              </p>
            </div>
          </Link>
          {/* Tombol tutup (mobile) */}
          <button
            onClick={() => setOpen(false)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-150
                  ${active
                    ? 'bg-amber-gradient text-white shadow-amber'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bawah: Lihat Kiosk + Logout */}
        <div className="px-3 py-4 border-t border-white/5 space-y-1 shrink-0">
          <Link
            href="/"
            target="_blank"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
          >
            <Sandwich className="w-5 h-5 shrink-0" />
            Lihat Kiosk
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
              text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
