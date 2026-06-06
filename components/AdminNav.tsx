'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ClipboardList, Sandwich, LogOut, LayoutDashboard, Tag, Radio, BarChart3, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/admin/orders',     label: 'Kasir Live', icon: Radio },
  { href: '/admin',            label: 'Histori',   icon: ClipboardList },
  { href: '/admin/reports',    label: 'Laporan',   icon: BarChart3 },
  { href: '/admin/menu',       label: 'Menu',      icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Kategori',  icon: Tag },
  { href: '/admin/settings',   label: 'Settings',  icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav className="bg-gray-950 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-5 flex items-center h-16 gap-1">

        {/* Brand */}
        <Link href="/admin" className="flex items-center gap-2.5 mr-6">
          <div className="w-8 h-8 bg-amber-gradient rounded-xl flex items-center justify-center shadow-amber">
            <Sandwich className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">SHAWARMA</p>
            <p className="text-amber-500/70 text-[10px] font-medium uppercase tracking-widest leading-none mt-0.5">
              Admin
            </p>
          </div>
        </Link>

        {/* Nav links */}
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                transition-all duration-150
                ${active
                  ? 'bg-amber-gradient text-white shadow-amber'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View store link */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-gray-300
            text-xs font-medium mr-3 transition-colors"
        >
          <Sandwich className="w-3.5 h-3.5" />
          Lihat Kiosk
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm
            transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </nav>
  )
}
