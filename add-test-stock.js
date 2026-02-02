const db = require('./database/db');
const bcrypt = require('bcryptjs');

async function setupTestData() {
    await db.initDatabase();
    try {
        console.log('🔄 Test verileri hazırlanıyor...');

        // 1. Salon Oluştur (Varsa ID'sini al)
        let salon = await db.queryOne('SELECT id FROM salons WHERE id = 1');
        if (!salon) {
            console.log('➕ Salon oluşturuluyor...');
            await db.run('INSERT INTO salons (id, name, owner_name, is_approved, is_active) VALUES (1, "Test Salon", "Test Owner", 1, 1)');
        }

        // 2. Stok Ekle
        await db.run('DELETE FROM stock WHERE item_name = "Test Şampuan"'); // Temizle
        await db.run(`INSERT INTO stock (salon_id, item_name, quantity, unit, min_quantity, item_type, unit_cost) 
                      VALUES (1, 'Test Şampuan', 100, 'Adet', 10, 'shampoo', 50)`);
        console.log('✅ Stok Hazır (100 adet)');

        // 3. Patron Kullanıcısı (superadmin yerine test patronu)
        const hash = await bcrypt.hash('patron123', 10);
        await db.run('DELETE FROM users WHERE username = "testpatron"');
        await db.run(`INSERT INTO users (username, password, role, full_name, salon_id, is_active) 
                      VALUES ('testpatron', ?, 'PATRON', 'Test Patron', 1, 1)`, [hash]);
        console.log('✅ Patron Kullanıcısı Hazır (testpatron / patron123)');

        // 4. Personel
        await db.run('DELETE FROM users WHERE username = "teststaff"');
        await db.run(`INSERT INTO users (username, password, role, full_name, salon_id, is_active, commission_rate) 
                      VALUES ('teststaff', ?, 'STAFF', 'Test Staff', 1, 1, 0.10)`, [hash]);
        console.log('✅ Personel Hazır (teststaff)');

        // 5. Hizmet
        await db.run('DELETE FROM services WHERE name = "Test Kesim"');
        await db.run(`INSERT INTO services (salon_id, name, price, duration, is_active, shampoo_usage) 
                      VALUES (1, 'Test Kesim', 200, 30, 1, 1)`);
        console.log('✅ Hizmet Hazır (Test Kesim - 200 TL - 1 Adet Şampuan)');

        console.log('🎉 TÜM TEST VERİLERİ HAZIR!');

    } catch (e) {
        console.log('Hata:', e.message);
    }
}

setupTestData();
