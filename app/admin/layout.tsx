'use client'

import { usePathname } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'

  if (isLogin) {
    return <div className="min-h-screen bg-white">{children}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-5 py-7">
        {children}
      </main>
    </div>
  )
}
