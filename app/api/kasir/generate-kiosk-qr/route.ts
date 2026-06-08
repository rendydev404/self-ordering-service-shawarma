import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const supabaseService = createServiceClient()
    const { data: profile } = await supabaseService.from('profiles').select('role, outlet_id').eq('id', user.id).single()

    if (!profile || profile.role !== 'kasir') {
      return NextResponse.json({ error: 'Akses ditolak. Harus Kasir.' }, { status: 403 })
    }

    if (!profile.outlet_id) {
      return NextResponse.json({ error: 'Kasir belum dihubungkan ke cabang manapun.' }, { status: 400 })
    }

    // Cari user kiosk di outlet yang sama
    const { data: kioskProfile } = await supabaseService
      .from('profiles')
      .select('username')
      .eq('role', 'kiosk')
      .eq('outlet_id', profile.outlet_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!kioskProfile) {
      return NextResponse.json({ 
        error: 'Tidak ditemukan akun Kiosk aktif untuk cabang ini. Silakan hubungi Admin.' 
      }, { status: 404 })
    }

    // Reconstruct the email defined in /api/users creation
    const email = `${kioskProfile.username}@outlet.local`

    // Generate magic link via Supabase Admin API
    const { data, error } = await supabaseService.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (error || !data.properties?.action_link) {
      console.error('Error generating magic link:', error)
      return NextResponse.json({ error: 'Gagal membuat tautan otomatis.' }, { status: 500 })
    }

    return NextResponse.json({ action_link: data.properties.action_link })
    
  } catch (err: any) {
    console.error('API Error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan internal peladen.' }, { status: 500 })
  }
}
