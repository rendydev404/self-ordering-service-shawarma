-- Tabel guides untuk Buku Panduan dinamis
CREATE TABLE IF NOT EXISTS guides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guides_select_public" ON guides;
DROP POLICY IF EXISTS "guides_all_admin" ON guides;

CREATE POLICY "guides_select_public" ON guides FOR SELECT USING (true);
CREATE POLICY "guides_all_admin" ON guides FOR ALL USING (get_user_role() = 'admin');

-- Seed Data Awal
INSERT INTO guides (category, title, content, sort_order) VALUES
  ('1. Memulai Sistem', 'Pengenalan Peran Pengguna', 'Sistem ini memiliki 3 peran utama: Admin Pusat (mengelola seluruh cabang dan menu), Kasir Cabang (mengelola pesanan dan Kiosk di cabang masing-masing), dan Kiosk (tablet untuk pelanggan mandiri memesan).', 1),
  ('1. Memulai Sistem', 'Cara Login', 'Silakan masukkan Username/Email dan Password Anda di halaman utama. Jika Anda Kasir, Anda akan diarahkan ke Dashboard Kasir. Jika Admin, ke Dashboard Admin.', 2),
  ('2. Panduan Admin', 'Mengelola Menu Makanan', 'Gunakan menu "Manajemen Menu" di Dashboard Admin untuk menambah, mengubah, atau menghapus produk. Semua perubahan akan langsung diterapkan ke seluruh Kiosk.', 1),
  ('3. Panduan Kasir', 'Menghubungkan Tablet Kiosk', 'Di Dashboard Kasir, masuk ke menu "Kontrol Kiosk". Pilih "Hubungkan Kiosk", lalu gunakan kamera tablet Kiosk untuk memindai (scan) QR Code yang muncul di layar Kasir.', 1),
  ('4. Solusi Masalah', 'Kiosk Terlogout Otomatis', 'Jika perangkat Kiosk tiba-tiba terlogout, mintalah Kasir untuk membuka kembali "Kontrol Kiosk" dan membuat ulang QR Code koneksi.', 1)
ON CONFLICT DO NOTHING;
