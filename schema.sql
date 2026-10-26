-- Skema database FoundIt! (PostgreSQL: Neon / Supabase)
-- Jalankan seluruh file ini di SQL Editor.

DROP TABLE IF EXISTS claims, reports, locations, categories, users CASCADE;

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE locations (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE reports (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  type        VARCHAR(12) NOT NULL CHECK (type IN ('hilang', 'ditemukan')),
  item_name   VARCHAR(150) NOT NULL,
  description TEXT,
  event_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- waktu kehilangan / penemuan
  status      VARCHAR(20) NOT NULL DEFAULT 'masih_dicari'
              CHECK (status IN ('masih_dicari', 'sudah_ditemukan', 'sudah_dikembalikan')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel pivot many-to-many: users <-> reports (user mengklaim laporan barang ditemukan)
CREATE TABLE claims (
  id         SERIAL PRIMARY KEY,
  report_id  INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  claimer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT,
  status     VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, claimer_id)
);

CREATE INDEX idx_reports_category ON reports(category_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Data awal
INSERT INTO categories (name) VALUES
  ('Elektronik'), ('Dokumen'), ('Aksesoris'), ('Pakaian'), ('Tas dan Dompet'), ('Lainnya');

INSERT INTO locations (name) VALUES
  ('Perpustakaan Pusat'), ('Gedung FTIS'), ('Kantin'), ('Masjid Kampus'), ('Parkiran'), ('Auditorium');

INSERT INTO users (name, email, phone) VALUES
  ('Budi Santoso', 'budi.santoso@student.uns.ac.id', '081234567890'),
  ('Siti Rahma', 'siti.rahma@student.uns.ac.id', '081298765432');
