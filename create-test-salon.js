const { initDatabase, getDb } = require('./database/db');
const bcrypt = require('bcryptjs');

async function createTestSalon() {
    try {
        await initDatabase();
        const db = getDb();

        // Create test salon
        db.run(
            `INSERT INTO salons (name, owner_name, address, phone, email, is_approved, subscription_status)
             VALUES (?, ?, ?, ?, ?, 0, 'trial')`,
            ['Test Kuaför Salonu', 'Test Patron', 'Test Adres 123', '0555 123 4567', 'test@salon.com'],
            async function (err) {
                if (err) {
                    console.error('Salon oluşturma hatası:', err);
                    process.exit(1);
                }

                const salonId = this.lastID;
                console.log(`✅ Test salon oluşturuldu (ID: ${salonId})`);

                // Create patron user for this salon
                const hashedPassword = await bcrypt.hash('test123', 10);

                db.run(
                    `INSERT INTO users (username, password, role, full_name, email, phone, salon_id, is_active)
                     VALUES (?, ?, 'PATRON', ?, ?, ?, ?, 1)`,
                    ['testsalon', hashedPassword, 'Test Patron', 'test@salon.com', '0555 123 4567', salonId],
                    function (err) {
                        if (err) {
                            console.error('Patron oluşturma hatası:', err);
                            process.exit(1);
                        }

                        console.log('✅ Test patron oluşturuldu');
                        console.log('\nTest Salon Bilgileri:');
                        console.log('  Salon ID:', salonId);
                        console.log('  Salon Adı: Test Kuaför Salonu');
                        console.log('  Patron: Test Patron');
                        console.log('  Kullanıcı Adı: testsalon');
                        console.log('  Şifre: test123');
                        console.log('  Durum: Onay Bekliyor');
                        console.log('\nSuper Admin panelinde "Bekleyen Onaylar" bölümünde görünmelidir!');
                        process.exit(0);
                    }
                );
            }
        );
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

createTestSalon();
