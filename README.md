# kuaför randevu - Akıllı Kuaför Yönetim Sistemi

Modern, profesyonel ve dark temalı SaaS kuaför salonu yönetim sistemi.

## 🚀 Özellikler

### Hiyerarşik Yönetim
- **Super Admin**: Salonları onaylar, dondurur, sistem cirosunu izler
- **Salon Patronu**: Personel ekler, katalog yönetir, stok ve finans takibi
- **Personel**: Randevuları yönetir, prim bilgisi görür, sabit müşteri listesi

### Müşteri Randevu Sistemi
- Kayıtsız randevu oluşturma
- Salon ve hizmet seçimi (Before/After görseller)
- Müsait personel ve saat kontrolü
- Otomatik çakışma kontrolü

### Operasyon Yönetimi
- Randevu tamamlama (Geldi/Gelmedi)
- Otomatik stok düşümü (şampuan, boya)
- Prim hesaplama: `Net Kar = Hizmet Bedeli - Malzeme Maliyeti - Personel Primi`

### CRM & Analiz
- Müşteri karnesi (geçmiş randevular, boya reçeteleri)
- Sabit müşteri ataması
- Personel performans analizi
- Kar-zarar grafikleri

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Server'ı başlat
npm start
```

Server: http://localhost:3000

## 🔐 İlk Giriş

**Super Admin:**
- Kullanıcı Adı: `superadmin`
- Şifre: `admin123`

## 🛠️ Teknoloji Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Authentication**: JWT
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Tasarım**: Dark tema, Inter font, Glassmorphism

## 📁 Proje Yapısı

```
beautyflow-saas/
├── database/
│   ├── schema.sql          # Database şeması
│   ├── db.js              # Database bağlantısı
│   └── beautyflow.db      # SQLite database (otomatik oluşur)
├── middleware/
│   └── auth.js            # JWT authentication
├── routes/
│   ├── auth.js            # Login, register
│   ├── superadmin.js      # Super admin endpoints
│   ├── patron.js          # Patron endpoints
│   ├── staff.js           # Personel endpoints
│   └── public.js          # Public endpoints (randevu)
├── services/
│   ├── stockService.js    # Stok yönetimi
│   ├── commissionService.js # Prim hesaplama
│   └── crmService.js      # CRM işlemleri
├── public/
│   ├── index.html         # Landing page
│   ├── login.html         # Giriş sayfası
│   ├── css/
│   │   └── main.css       # Ana stil dosyası
│   ├── js/
│   │   ├── utils.js       # Utility fonksiyonlar
│   │   └── landing.js     # Landing page logic
│   └── superadmin/
│       └── dashboard.html # Super admin paneli
├── server.js              # Ana server dosyası
├── package.json
└── .env                   # Environment variables
```

## 🎨 Tasarım

- **Dark Tema**: Profesyonel ve modern görünüm
- **Inter Font**: Kurumsal tipografi
- **Glassmorphism**: Şık cam efektleri
- **Responsive**: Mobil uyumlu

## 📝 API Endpoints

### Public
- `GET /api/public/salons` - Aktif salonlar
- `GET /api/public/catalog/:salonId` - Salon kataloğu
- `GET /api/public/available-slots` - Müsait saatler
- `POST /api/public/book-appointment` - Randevu oluştur

### Auth
- `POST /api/auth/login` - Giriş yap
- `POST /api/auth/register-salon` - Salon kaydı
- `GET /api/auth/verify` - Token doğrula

### Super Admin
- `GET /api/superadmin/salons` - Tüm salonlar
- `POST /api/superadmin/salons/:id/approve` - Salon onayla
- `POST /api/superadmin/salons/:id/toggle-status` - Dondur/Aktifleştir
- `GET /api/superadmin/analytics` - Sistem istatistikleri

### Patron
- `GET /api/patron/staff` - Personel listesi
- `POST /api/patron/staff` - Personel ekle
- `GET /api/patron/catalog` - Hizmet kataloğu
- `POST /api/patron/catalog` - Hizmet ekle
- `GET /api/patron/stock` - Stok listesi
- `GET /api/patron/analytics` - Salon analytics

### Staff
- `GET /api/staff/appointments` - Randevular
- `POST /api/staff/appointments/:id/complete` - Randevu tamamla
- `GET /api/staff/customers` - Sabit müşteriler
- `GET /api/staff/commission` - Prim bilgisi

## 🔄 Otomatik İşlemler

1. **Randevu Tamamlama**: Personel randevuyu tamamladığında:
   - Kullanılan şampuan ve boya stoktan otomatik düşer
   - Prim hesaplanır ve kaydedilir
   - Müşteri karnesi güncellenir
   - Boya reçetesi kaydedilir

2. **Prim Hesaplama**:
   ```
   Net Kar = Hizmet Bedeli - Malzeme Maliyeti
   Prim = Net Kar × 0.15 (varsayılan %15)
   ```

## 📊 Veritabanı Tabloları

- `users` - Kullanıcılar (Super Admin, Patron, Personel)
- `salons` - Salonlar
- `services` - Hizmetler/Katalog
- `service_images` - Before/After görseller
- `appointments` - Randevular
- `stock` - Stok
- `stock_movements` - Stok hareketleri
- `customer_records` - Müşteri kayıtları (CRM)
- `dye_formulas` - Boya reçeteleri
- `commissions` - Primler
- `transactions` - Finansal işlemler

## 🎯 Kullanım Senaryosu

1. **Salon Kaydı**: Patron login sayfasından salon kaydı oluşturur
2. **Onay**: Super Admin salonu onaylar
3. **Kurulum**: Patron personel ekler, hizmet kataloğunu oluşturur, stok girer
4. **Randevu**: Müşteri landing page'den randevu alır
5. **İşlem**: Personel randevuyu tamamlar, stok otomatik düşer, prim hesaplanır
6. **Analiz**: Patron kar-zarar ve personel performansını izler

## 📄 Lisans

MIT

## 👨‍💻 Geliştirici

Ali Koçak - BeautyFlow SaaS
