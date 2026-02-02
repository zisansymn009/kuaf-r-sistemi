const axios = require('axios');
const db = require('./database/db');

async function runTest() {
    console.log('\n🚀 BAŞLIYOR: Senaryo 1 - Randevu -> Finans -> Stok Entegrasyonu\n');

    try {
        await db.initDatabase();

        // 1. Önce Stok Durumunu Kontrol Et (Örn: Şampuan)
        const shampoo = await db.queryOne("SELECT * FROM stock WHERE item_type = 'shampoo' LIMIT 1");
        if (!shampoo) throw new Error('Test için şampuan stoğu bulunamadı!');

        console.log(`📦 Başlangıç Stok Durumu (${shampoo.item_name}): ${shampoo.quantity} birim`);

        // 2. Patron Girişi Yap
        console.log('🔑 Patron girişi yapılıyor...');
        // Varsayılan patron şifresi 'patron123' veya 'admin123' olabilir, ikisini de deneyelim veya bilinen bir kullanıcıyı kullanalım.
        // Daha güvenli yol: 'superadmin' ile girip işlem yapmak veya 'ali' kullanıcısını kullanmak.
        let loginRes;
        try {
            loginRes = await axios.post('http://localhost:3000/api/auth/login', {
                username: 'testpatron',
                password: 'patron123'
            });
        } catch (e) {
            console.log('Giriş hatası:', e.message);
            throw e;
        }

        const token = loginRes.data.token;
        const salonId = loginRes.data.user.salon_id;
        console.log(`✅ Giriş Başarılı. Salon ID: ${salonId}`);

        // 3. Çalışan ve Hizmet Bul
        const staff = await db.queryOne('SELECT id FROM users WHERE role = "STAFF" AND salon_id = ? LIMIT 1', [salonId]);
        // Özellikle Test Kesim hizmetini bulmaya çalışalım, yoksa herhangi birini
        let service = await db.queryOne('SELECT * FROM services WHERE salon_id = ? AND name = "Test Kesim" LIMIT 1', [salonId]);
        if (!service) {
            console.log('Test Kesim bulunamadı, rastgele hizmet seçiliyor...');
            service = await db.queryOne('SELECT * FROM services WHERE salon_id = ? LIMIT 1', [salonId]);
        }

        if (!staff || !service) throw new Error('Test için çalışan veya hizmet bulunamadı.');

        console.log(`✅ Seçilen Hizmet: ${service.name} (ID: ${service.id}, Şampuan: ${service.shampoo_usage})`);

        // 4. Randevu Oluştur
        console.log('📅 Test randevusu oluşturuluyor...');
        const aptDate = new Date().toISOString().split('T')[0];
        const createRes = await axios.post('http://localhost:3000/api/patron/appointments', {
            customer_name: 'Test Müşteri Entegrasyon',
            customer_phone: '5550009988',
            service_id: service.id,
            staff_id: staff.id,
            appointment_date: aptDate,
            appointment_time: '12:00',
            notes: 'Entegrasyon testi için otomatik oluşturuldu.'
        }, { headers: { 'Authorization': `Bearer ${token}` } });

        const appointmentId = createRes.data.id || createRes.data.appointmentId; // API dönüş yapısına göre
        // Eğer API id dönmüyorsa, son eklenen id'yi alalım
        const lastApt = await db.queryOne('SELECT id FROM appointments ORDER BY id DESC LIMIT 1');
        const finalAptId = appointmentId || lastApt.id;

        console.log(`✅ Randevu Oluşturuldu. ID: ${finalAptId}`);

        // 5. Randevuyu TAMAMLA (Kritik Adım)
        console.log('⏳ Randevu tamamlanıyor (Müşteri geldi, işlem bitti)...');

        // Not: Şampuan kullanımı Hizmet (Service) tablosundan çekilecek (add-test-stock.js ile tanımlandı)

        const completeRes = await axios.post(`http://localhost:3000/api/patron/appointments/${finalAptId}/complete`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Randevu Tamamlandı Yanıtı:', completeRes.data);

        // 6. KONTROL 1: Finans (Transaction oluştu mu?)
        console.log('\n💰 KONTROL 1: Finans Kaydı');
        const transaction = await db.queryOne(
            'SELECT * FROM transactions WHERE appointment_id = ? AND transaction_type = "income"',
            [finalAptId]
        );

        if (transaction) {
            console.log(`✅ BAŞARILI: Kasaya ${transaction.amount} TL giriş yapıldı. (ID: ${transaction.id})`);
        } else {
            console.error('❌ BAŞARISIZ: Finans kaydı oluşmadı!');
        }

        // 7. KONTROL 2: Stok (Düşüm yapıldı mı?)
        console.log('\n📦 KONTROL 2: Stok Düşümü');
        const shampooAfter = await db.queryOne("SELECT * FROM stock WHERE id = ?", [shampoo.id]);

        console.log(`Bitiş Stoğu: ${shampooAfter.quantity}`);
        const diff = shampoo.quantity - shampooAfter.quantity;

        if (diff > 0) {
            console.log(`✅ BAŞARILI: Stoktan ${diff} birim düşüldü.`);
        } else {
            console.error('❌ BAŞARISIZ: Stok değişmedi!');
        }

        console.log('\n🏁 TEST SONUCU:');
        if (transaction && diff > 0) {
            console.log('🟢 SİSTEM TAM ENTEGRE ÇALIŞIYOR.');
        } else {
            console.log('🔴 SİSTEMDE ENTEGRASYON HATASI VAR.');
        }

    } catch (error) {
        console.error('❌ TEST HATASI:', error.message);
        if (error.response) console.error('API Yanıtı:', error.response.data);
    }
}

runTest();
