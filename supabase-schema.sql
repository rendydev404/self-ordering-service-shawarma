-- ============================================================
-- SHAWARMA Self-Ordering Kiosk — Supabase Schema LENGKAP
-- Jalankan script ini di: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABEL CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABEL MENU ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID           REFERENCES categories(id) ON DELETE SET NULL,
  name         TEXT           NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2)  NOT NULL CHECK (price > 0),
  image_url    TEXT,                         -- URL foto dari Supabase Storage
  is_available BOOLEAN        DEFAULT TRUE,
  sort_order   INTEGER        DEFAULT 0,
  created_at   TIMESTAMPTZ    DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    DEFAULT NOW()
);

-- ============================================================
-- 3. TABEL ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   SERIAL        UNIQUE,        -- nomor antrian otomatis (1, 2, 3, ...)
  customer_name  TEXT,
  status         TEXT          DEFAULT 'pending'
                               CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  payment_method TEXT          CHECK (payment_method IN ('cash','qris','card')),
  total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  notes          TEXT,
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- 4. TABEL ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID          REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   UUID          REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT          NOT NULL,     -- snapshot nama saat order
  quantity       INTEGER       NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  unit_price     DECIMAL(10,2) NOT NULL,     -- snapshot harga saat order (immutable)
  subtotal       DECIMAL(10,2) NOT NULL,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Hapus policies lama jika ada (aman dijalankan ulang)
DROP POLICY IF EXISTS "categories_select_public"  ON categories;
DROP POLICY IF EXISTS "categories_all_admin"       ON categories;
DROP POLICY IF EXISTS "menu_items_select_public"   ON menu_items;
DROP POLICY IF EXISTS "menu_items_all_admin"       ON menu_items;
DROP POLICY IF EXISTS "orders_select_public"       ON orders;
DROP POLICY IF EXISTS "orders_update_admin"        ON orders;
DROP POLICY IF EXISTS "orders_delete_admin"        ON orders;
DROP POLICY IF EXISTS "order_items_select_public"  ON order_items;

-- Categories: semua bisa baca, hanya admin bisa tulis
CREATE POLICY "categories_select_public"
  ON categories FOR SELECT USING (true);

CREATE POLICY "categories_all_admin"
  ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Menu Items: semua bisa baca, hanya admin bisa tulis
CREATE POLICY "menu_items_select_public"
  ON menu_items FOR SELECT USING (true);

CREATE POLICY "menu_items_all_admin"
  ON menu_items FOR ALL USING (auth.role() = 'authenticated');

-- Orders: semua bisa baca (untuk halaman sukses)
-- INSERT hanya lewat /api/checkout (service_role bypass RLS)
-- UPDATE/DELETE hanya admin
CREATE POLICY "orders_select_public"
  ON orders FOR SELECT USING (true);

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "orders_delete_admin"
  ON orders FOR DELETE USING (auth.role() = 'authenticated');

-- Order Items: semua bisa baca
-- INSERT hanya lewat service_role (API checkout)
CREATE POLICY "order_items_select_public"
  ON order_items FOR SELECT USING (true);

-- ============================================================
-- 6. SUPABASE STORAGE — BUCKET "menu-images"
-- ============================================================

-- Buat bucket untuk foto produk (public = bisa diakses tanpa auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,   -- max 5 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Hapus policies storage lama jika ada
DROP POLICY IF EXISTS "Public can view menu images"   ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload menu images"  ON storage.objects;
DROP POLICY IF EXISTS "Admin can update menu images"  ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete menu images"  ON storage.objects;

-- Siapa saja bisa melihat/download foto (karena bucket public)
CREATE POLICY "Public can view menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Hanya admin (authenticated) yang bisa upload foto baru
CREATE POLICY "Admin can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- Hanya admin yang bisa update/replace foto
CREATE POLICY "Admin can update menu images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- Hanya admin yang bisa hapus foto
CREATE POLICY "Admin can delete menu images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- ============================================================
-- 7. DATA DUMMY — KATEGORI
-- ============================================================
INSERT INTO categories (name, sort_order) VALUES
  ('Shawarma',  1),
  ('Sides',     2),
  ('Beverages', 3),
  ('Paket',     4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. DATA DUMMY — MENU ITEMS (tanpa foto, upload via admin)
-- ============================================================
INSERT INTO menu_items (category_id, name, description, price, is_available, sort_order)
SELECT
  c.id,
  m.name,
  m.description,
  m.price,
  true,
  m.sort_order
FROM (VALUES
  ('Shawarma',
   'Chicken Shawarma',
   'Wrap ayam panggang dengan saus spesial, sayuran segar, dan rempah khas Timur Tengah',
   35000, 1),

  ('Shawarma',
   'Beef Shawarma',
   'Wrap daging sapi pilihan dengan bumbu shawarma otentik dan saus yogurt creamy',
   45000, 2),

  ('Shawarma',
   'Shawarma Rice Bowl',
   'Nasi hangat bertabur daging shawarma, salad segar, dan saus rahasia kami',
   40000, 3),

  ('Sides',
   'French Fries',
   'Kentang goreng renyah keemasan dengan pilihan saus sambal, mayo, atau BBQ',
   20000, 1),

  ('Sides',
   'Falafel',
   'Bola falafel dari kacang chickpea, renyah di luar lembut di dalam, dengan saus tahini',
   25000, 2),

  ('Beverages',
   'Iced Tea',
   'Teh manis dingin segar, pilihan sempurna menemani shawarma',
   10000, 1),

  ('Beverages',
   'Lemon Mint',
   'Minuman lemon segar dengan daun mint dan es batu, sangat menyegarkan',
   15000, 2),

  ('Paket',
   'Paket Hemat Shawarma',
   'Chicken Shawarma + French Fries + Iced Tea — hemat Rp5.000 dibanding beli satuan',
   55000, 1)
) AS m(category_name, name, description, price, sort_order)
JOIN categories c ON c.name = m.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM menu_items WHERE name = m.name
);

-- ============================================================
-- SELESAI!
--
-- Setelah menjalankan script ini:
-- 1. Cek tabel: Table Editor > menu_items, orders, dll
-- 2. Cek bucket: Storage > menu-images (harus muncul & public)
-- 3. Buat admin user: Authentication > Users > Add user
-- 4. Isi .env.local dengan URL & keys dari Settings > API
--
-- Verifikasi data:
-- SELECT mi.name, c.name as kategori, mi.price
-- FROM menu_items mi
-- LEFT JOIN categories c ON c.id = mi.category_id
-- ORDER BY c.sort_order, mi.sort_order;
-- ============================================================
