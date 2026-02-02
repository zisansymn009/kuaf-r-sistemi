const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');

db.serialize(() => {
    console.log('--- Migration Başladı ---');

    // 1. Mevcut tabloyu yedekle (Rename)
    db.run("ALTER TABLE appointments RENAME TO appointments_old", (err) => {
        if (err) {
            console.error('Rename Hatası:', err);
            return;
        }
        console.log('✅ Eski tablo yedeklendi');

        // 2. Yeni tabloyu NULLABLE staff_id ile oluştur
        db.run(`CREATE TABLE appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            staff_id INTEGER, -- NULLABLE
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
        )`, (err) => {
            if (err) {
                console.error('Yaratma Hatası:', err);
                return;
            }
            console.log('✅ Yeni tablo oluşturuldu');

            // 3. Verileri aktar
            db.run("INSERT INTO appointments SELECT * FROM appointments_old", (err) => {
                if (err) {
                    console.error('Veri Aktarım Hatası:', err);
                } else {
                    console.log('✅ Veriler başarıyla aktarıldı');

                    // 4. Eski tabloyu sil
                    db.run("DROP TABLE appointments_old", (err) => {
                        if (err) console.error('Temizlik Hatası:', err);
                        else console.log('✅ Eski tablo temizlendi');
                    });
                }
            });
        });
    });
});

setTimeout(() => { db.close(); }, 3000);
