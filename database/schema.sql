-- BeautyFlow SaaS Database Schema
-- SQLite Database

-- Kullanıcılar Tablosu (Super Admin, Patron, Personel)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Salonlar Tablosu
CREATE TABLE IF NOT EXISTS salons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME
);

-- Hizmetler/Katalog Tablosu
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration INTEGER NOT NULL, -- dakika cinsinden
    category TEXT, -- Saç, Makyaj, Cilt Bakımı vs.
    shampoo_usage REAL DEFAULT 0, -- gram cinsinden
    dye_usage REAL DEFAULT 0, -- cl cinsinden
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Before/After Görseller
CREATE TABLE IF NOT EXISTS service_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    image_type TEXT CHECK(image_type IN ('before', 'after')),
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Randevular Tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- Stok Tablosu
CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    brand TEXT, -- Marka (L'Oreal, Wella, vb.)
    item_type TEXT CHECK(item_type IN ('shampoo', 'dye', 'oxidant', 'care', 'other')),
    quantity REAL NOT NULL,
    unit TEXT NOT NULL, -- gr, cl, adet
    unit_cost REAL NOT NULL,
    min_quantity REAL DEFAULT 10,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Fiziksel Stok Sayımları (Fire Analizi İçin)
CREATE TABLE IF NOT EXISTS stock_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    system_quantity REAL NOT NULL, -- Sayım anındaki sistem miktarı
    physical_quantity REAL NOT NULL, -- Gözle görülen gerçek miktar
    discrepancy REAL NOT NULL, -- Fark (Fire)
    count_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (stock_id) REFERENCES stock(id)
);

-- Stok Hareketleri
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    appointment_id INTEGER,
    movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')),
    quantity REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stock(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Müşteri Kayıtları (CRM)
CREATE TABLE IF NOT EXISTS customer_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    staff_id INTEGER, -- Sabit müşteri ise hangi personele ait
    is_regular INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_visit DATETIME,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- Boya Reçeteleri
CREATE TABLE IF NOT EXISTS dye_formulas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_record_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    formula_details TEXT NOT NULL, -- JSON formatında boya karışımı
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_record_id) REFERENCES customer_records(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Prim/Komisyon Tablosu
CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    service_price REAL NOT NULL,
    material_cost REAL NOT NULL,
    commission_amount REAL NOT NULL,
    commission_rate REAL DEFAULT 0.15, -- %15 varsayılan
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Finansal İşlemler
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    appointment_id INTEGER,
    transaction_type TEXT CHECK(transaction_type IN ('income', 'expense')),
    amount REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- İlk Super Admin Kullanıcısı
INSERT OR IGNORE INTO users (id, username, password, role, full_name, email, is_active) 
VALUES (1, 'superadmin', '$2a$10$cInQ8pcGyZy3/bquy1nZl..4ewpMwFsoXietwjA4RYdXY.XjxKuR2', 'SUPER_ADMIN', 'System Admin', 'admin@beautyflow.com', 1);

-- Personel Özel Pirim Oranları (Hizmet bazlı)
CREATE TABLE IF NOT EXISTS staff_service_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    commission_rate REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    UNIQUE(staff_id, service_id)
);

-- Personel Çalışma Saatleri ve İzinleri
CREATE TABLE IF NOT EXISTS staff_working_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 (Pazar) - 6 (Cumartesi)
    start_time TEXT, -- HH:mm
    end_time TEXT, -- HH:mm
    is_off INTEGER DEFAULT 0, -- 1 ise izinli
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    UNIQUE(staff_id, day_of_week)
);

-- Personel Avans ve Ödemeleri
CREATE TABLE IF NOT EXISTS staff_advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- Personel Vardiyaları (Detaylı Mesai)
CREATE TABLE IF NOT EXISTS staff_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    shift_type TEXT DEFAULT 'regular' CHECK(shift_type IN ('regular', 'overtime', 'night')),
    is_absent INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id)
);

-- Featured Salon Başvuruları
CREATE TABLE IF NOT EXISTS featured_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    requested_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    duration_days INTEGER DEFAULT 7,
    approved_by INTEGER,
    approved_at TEXT,
    notes TEXT,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);
CREATE TABLE IF NOT EXISTS service_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    quantity REAL NOT NULL, -- Kullanım miktarı (gr, cl, adet)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (stock_id) REFERENCES stock(id),
    UNIQUE(service_id, stock_id)
);

-- Salon Çalışma Saatleri
CREATE TABLE IF NOT EXISTS salon_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 (Pazar) - 6 (Cumartesi)
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '20:00',
    is_closed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    UNIQUE(salon_id, day_of_week)
);

-- Salon Vitrini (Kampanyalar ve Örnek Çalışmalar)
CREATE TABLE IF NOT EXISTS salon_showcase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('campaign', 'service_sample')),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Varsayılan Onaylı Salon (Render sıfırlansa da silinmez)
INSERT OR IGNORE INTO salons (id, name, owner_name, address, phone, is_approved, is_active, subscription_status)
VALUES (100, 'By Ali Koçak Test Salonu', 'Ali Koçak', 'İstanbul, Türkiye', '05551112233', 1, 1, 'active');

-- Varsayılan Patron Hesabı (Şifre: ali123)
INSERT OR IGNORE INTO users (id, username, password, role, full_name, salon_id, is_active)
VALUES (100, 'kuafor_ali', '$2a$10$tj8lNPuI60zsd3XEbOZtXuwJCqL8/JU8ix2drzk3LHHjd8NF8bG/GG', 'PATRON', 'Ali Koçak', 100, 1);
