-- BeautyFlow SaaS Database Schema
-- PostgreSQL Database

-- Kullanıcılar Tablosu (Super Admin, Patron, Personel)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'PATRON', 'STAFF')),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    salon_id INTEGER,
    commission_rate REAL DEFAULT 0.15, -- Personel pirim oranı (varsayılan %15)
    aura_points INTEGER DEFAULT 0, -- Sadakat puanı
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salonlar Tablosu
CREATE TABLE IF NOT EXISTS salons (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    owner_name TEXT NOT NULL,
    is_approved INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    subscription_status TEXT DEFAULT 'trial' CHECK(subscription_status IN ('trial', 'active', 'suspended')),
    is_featured INTEGER DEFAULT 0,
    featured_until TEXT,
    featured_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- Hizmetler/Katalog Tablosu
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration INTEGER NOT NULL, -- dakika cinsinden
    category TEXT, -- Saç, Makyaj, Cilt Bakımı vs.
    shampoo_usage REAL DEFAULT 0, -- gram cinsinden
    dye_usage REAL DEFAULT 0, -- cl cinsinden
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Before/After Görseller
CREATE TABLE IF NOT EXISTS service_images (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id),
    image_type TEXT CHECK(image_type IN ('before', 'after')),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Randevular Tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    staff_id INTEGER NOT NULL REFERENCES users(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Stok Tablosu
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    item_name TEXT NOT NULL,
    brand TEXT, -- Marka (L'Oreal, Wella, vb.)
    item_type TEXT CHECK(item_type IN ('shampoo', 'dye', 'oxidant', 'care', 'other')),
    quantity REAL NOT NULL,
    unit TEXT NOT NULL, -- gr, cl, adet
    unit_cost REAL NOT NULL,
    min_quantity REAL DEFAULT 10,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fiziksel Stok Sayımları (Fire Analizi İçin)
CREATE TABLE IF NOT EXISTS stock_counts (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    stock_id INTEGER NOT NULL REFERENCES stock(id),
    system_quantity REAL NOT NULL, -- Sayım anındaki sistem miktarı
    physical_quantity REAL NOT NULL, -- Gözle görülen gerçek miktar
    discrepancy REAL NOT NULL, -- Fark (Fire)
    count_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Stok Hareketleri
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL REFERENCES stock(id),
    appointment_id INTEGER REFERENCES appointments(id),
    movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')),
    quantity REAL NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Müşteri Kayıtları (CRM)
CREATE TABLE IF NOT EXISTS customer_records (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    staff_id INTEGER REFERENCES users(id), -- Sabit müşteri ise hangi personele ait
    is_regular INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP
);

-- Boya Reçeteleri
CREATE TABLE IF NOT EXISTS dye_formulas (
    id SERIAL PRIMARY KEY,
    customer_record_id INTEGER NOT NULL REFERENCES customer_records(id),
    appointment_id INTEGER NOT NULL REFERENCES appointments(id),
    formula_details TEXT NOT NULL, -- JSON formatında boya karışımı
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prim/Komisyon Tablosu
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    appointment_id INTEGER NOT NULL REFERENCES appointments(id),
    service_price REAL NOT NULL,
    material_cost REAL NOT NULL,
    commission_amount REAL NOT NULL,
    commission_rate REAL DEFAULT 0.15, -- %15 varsayılan
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finansal İşlemler
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    appointment_id INTEGER REFERENCES appointments(id),
    transaction_type TEXT CHECK(transaction_type IN ('income', 'expense')),
    amount REAL NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personel Özel Pirim Oranları (Hizmet bazlı)
CREATE TABLE IF NOT EXISTS staff_service_commissions (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    commission_rate REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, service_id)
);

-- Personel Çalışma Saatleri ve İzinleri
CREATE TABLE IF NOT EXISTS staff_working_hours (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    day_of_week INTEGER NOT NULL, -- 0 (Pazar) - 6 (Cumartesi)
    start_time TEXT, -- HH:mm
    end_time TEXT, -- HH:mm
    is_off INTEGER DEFAULT 0, -- 1 ise izinli
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, day_of_week)
);

-- Personel Avans ve Ödemeleri
CREATE TABLE IF NOT EXISTS staff_advances (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personel Vardiyaları (Detaylı Mesai)
CREATE TABLE IF NOT EXISTS staff_shifts (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    shift_type TEXT DEFAULT 'regular' CHECK(shift_type IN ('regular', 'overtime', 'night')),
    is_absent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Featured Salon Başvuruları
CREATE TABLE IF NOT EXISTS featured_requests (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    requested_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    duration_days INTEGER DEFAULT 7,
    approved_by INTEGER,
    approved_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS service_recipes (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    stock_id INTEGER NOT NULL REFERENCES stock(id),
    quantity REAL NOT NULL, -- Kullanım miktarı (gr, cl, adet)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, stock_id)
);

-- Salon Çalışma Saatleri
CREATE TABLE IF NOT EXISTS salon_hours (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    day_of_week INTEGER NOT NULL, -- 0 (Pazar) - 6 (Cumartesi)
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '20:00',
    is_closed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(salon_id, day_of_week)
);

-- Salon Vitrini (Kampanyalar ve Örnek Çalışmalar)
CREATE TABLE IF NOT EXISTS salon_showcase (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES salons(id),
    type TEXT CHECK(type IN ('campaign', 'service_sample')),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İlk Super Admin Kullanıcısı
INSERT INTO users (id, username, password, role, full_name, email, is_active) 
VALUES (1, 'superadmin', '$2a$10$cInQ8pcGyZy3/bquy1nZl..4ewpMwFsoXietwjA4RYdXY.XjxKuR2', 'SUPER_ADMIN', 'System Admin', 'admin@beautyflow.com', 1)
ON CONFLICT DO NOTHING;

-- Varsayılan Onaylı Salon (Render sıfırlansa da silinmez)
INSERT INTO salons (id, name, owner_name, address, phone, is_approved, is_active, subscription_status)
VALUES (100, 'By Ali Koçak Test Salonu', 'Ali Koçak', 'İstanbul, Türkiye', '05551112233', 1, 1, 'active')
ON CONFLICT DO NOTHING;

-- Varsayılan Patron Hesabı (Şifre: ali123)
INSERT INTO users (id, username, password, role, full_name, salon_id, is_active)
VALUES (100, 'kuafor_ali', '$2a$10$tj8lNPuI60zsd3XEbOZtXuwJCqL8/JU8ix2drzk3LHHjd8NF8bG/GG', 'PATRON', 'Ali Koçak', 100, 1)
ON CONFLICT DO NOTHING;
