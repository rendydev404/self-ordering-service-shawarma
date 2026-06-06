export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface MenuItem {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  sort_order: number
  categories?: Category
}

export interface CartItem {
  item: MenuItem
  quantity: number
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type PaymentMethod = 'cash' | 'qris' | 'card'

export interface Order {
  id: string
  order_number: number
  customer_name: string | null
  status: OrderStatus
  payment_method: PaymentMethod | null
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  menu_item_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export interface CheckoutPayload {
  customer_name: string
  notes: string
  payment_method: PaymentMethod
  items: {
    menu_item_id: string
    quantity: number
  }[]
}
