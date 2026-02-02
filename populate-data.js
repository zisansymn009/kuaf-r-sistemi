const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');

db.serialize(() => {
    // 1. Hizmetleri Ekle
    const services = [
        ['Saç Kesimi', 'Kesim & Stil', 250, 45, 1],
        ['Boya & Ombre', 'Renklendirme', 1500, 180, 1],
        ['Fön', 'Stil', 100, 30, 1],
        ['Cilt Bakımı', 'Bakım', 500, 60, 1]
    ];

    const stmt = db.prepare("INSERT INTO services (name, category, price, duration, salon_id, is_active) VALUES (?, ?, ?, ?, ?, 1)");
    services.forEach(s => stmt.run(s));
    stmt.finalize();
    console.log('✅ Hizmetler eklendi');

    // 2. Personel Ekle
    db.run("INSERT INTO users (username, password, role, full_name, salon_id, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        ['ayse.staff', '$2b$10$abcdefghijklmnopqrstuv', 'STAFF', 'Ayşe Yılmaz', 1, 1], (err) => {
            if (err) console.error(err);
            else console.log('✅ Personel eklendi');
        });

    // 3. Vitrin Kontrol/Ekle (Eğer boşsa)
    db.all("SELECT COUNT(*) as count FROM salon_showcase", (err, rows) => {
        if (rows[0].count === 0) {
            db.run("INSERT INTO salon_showcase (salon_id, type, title, description, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                [1, 'campaign', 'Yaz Kampanyası', 'Tüm renklendirme işlemlerinde %20 indirim!', 'https://images.unsplash.com/photo-1560066922-194519992d9e?q=80&w=400&auto=format&fit=crop', 1]);
            db.run("INSERT INTO salon_showcase (salon_id, type, title, description, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                [1, 'service_sample', 'Ombre Uygulamamız', 'Müşterimize uyguladığımız soğuk sarı ombre çalışması.', 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400&auto=format&fit=crop', 1]);
            console.log('✅ Vitrin öğeleri eklendi');
        }
    });
});

setTimeout(() => { db.close(); }, 2000);
