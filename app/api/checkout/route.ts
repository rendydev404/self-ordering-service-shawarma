import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCheckoutPayload } from '@/lib/validations'
import type { CheckoutPayload } from '@/types'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  // Validasi struktur request
  const errors = validateCheckoutPayload(body)
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0].message, details: errors },
      { status: 400 }
    )
  }

  const payload = body as CheckoutPayload

  // Gunakan service role untuk bypass RLS — harga divalidasi di sini, bukan dari frontend
  const supabase = createServiceClient()

  // Ambil data menu dari database (harga otoritatif dari server)
  const menuItemIds = payload.items.map((i) => i.menu_item_id)
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available')
    .in('id', menuItemIds)

  if (menuError) {
    return NextResponse.json({ error: 'Gagal memuat data menu' }, { status: 500 })
  }

  // Validasi setiap item: harus ada, harus tersedia
  const validatedItems: {
    menu_item_id: string
    menu_item_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[] = []

  let total = 0

  for (const reqItem of payload.items) {
    const menuItem = menuItems?.find((m) => m.id === reqItem.menu_item_id)

    if (!menuItem) {
      return NextResponse.json(
        { error: `Menu tidak ditemukan (ID: ${reqItem.menu_item_id})` },
        { status: 400 }
      )
    }

    if (!menuItem.is_available) {
      return NextResponse.json(
        { error: `"${menuItem.name}" sedang tidak tersedia` },
        { status: 400 }
      )
    }

    const quantity = Number(reqItem.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: `Jumlah untuk "${menuItem.name}" harus antara 1-10` },
        { status: 400 }
      )
    }

    // Gunakan harga dari DATABASE, bukan dari frontend
    const unitPrice = menuItem.price
    const subtotal = unitPrice * quantity

    total += subtotal
    
    // Embed note using a separator if it exists
    const finalName = reqItem.note && reqItem.note.trim() !== '' 
      ? `${menuItem.name}|NOTE|${reqItem.note.trim()}`
      : menuItem.name

    validatedItems.push({
      menu_item_id: menuItem.id,
      menu_item_name: finalName,
      quantity,
      unit_price: unitPrice,
      subtotal,
    })
  }

  // Buat order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: payload.customer_name || null,
      notes: null,
      payment_method: payload.payment_method,
      total_amount: total,
      status: 'pending',
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('Order creation error:', orderError)
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
  }

  // Buat order items
  const { error: itemsError } = await supabase.from('order_items').insert(
    validatedItems.map((item) => ({
      ...item,
      order_id: order.id,
    }))
  )

  if (itemsError) {
    console.error('Order items error:', itemsError)
    // Rollback: hapus order jika items gagal
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Gagal menyimpan item pesanan' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    total_amount: total,
  })
}
