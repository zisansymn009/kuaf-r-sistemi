const { initDatabase, getDb } = require('./database/db');
const bcrypt = require('bcryptjs');

async function createAndApproveSalon() {
    try {
        await initDatabase();
        const db = getDb();

        console.log('\n🏢 Yeni Salon Oluşturuluyor...\n');

        // Önce mevcut salonları kontrol et
        db.all('SELECT * FROM salons', [], async (err, salons) => {
            if (err) {
                console.error('❌ Hata:', err);
                process.exit(1);
            }

            console.log(`📊 Mevcut Salon Sayısı: ${salons.length}\n`);

            // Yeni salon bilgileri
            const salonData = {
                name: 'Elite Beauty Spa',
                owner_name: 'Zeynep Demir',
                email: 'info@elitebeauty.com',
                phone: '0533 777 6655',
                address: 'Nişantaşı Meydanı No:45, Şişli, İstanbul',
                is_approved: 1, // 1 = onaylı
                is_active: 1,   // 1 = aktif
                subscription_status: 'active', // trial, active, suspended
                created_at: new Date().toISOString(),
                approved_at: new Date().toISOString()
            };

            // Salon oluştur
            db.run(
                `INSERT INTO salons (name, owner_name, email, phone, address, is_approved, is_active, subscription_status, created_at, approved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    salonData.name,
                    salonData.owner_name,
                    salonData.email,
                    salonData.phone,
                    salonData.address,
                    salonData.is_approved,
                    salonData.is_active,
                    salonData.subscription_status,
                    salonData.created_at,
                    salonData.approved_at
                ],
                async function (err) {
                    if (err) {
                        console.error('❌ Salon oluşturma hatası:', err);
                        process.exit(1);
                    }

                    const salonId = this.lastID;
                    console.log('✅ Salon başarıyla oluşturuldu!');
                    console.log(`📋 Salon ID: ${salonId}\n`);

                    // Salon için patron kullanıcısı oluştur
                    const hashedPassword = await bcrypt.hash('admin123', 10);

                    db.run(
                        `INSERT INTO users (username, password, role, full_name, email, phone, salon_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            'zeynep',
                            hashedPassword,
                            'PATRON',
                            salonData.owner_name,
                            salonData.email,
                            salonData.phone,
                            salonId
                        ],
                        function (err) {
                            if (err) {
                                console.error('❌ Kullanıcı oluşturma hatası:', err);
                                process.exit(1);
                            }

                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            console.log('🎉 SALON VE KULLANICI BAŞARIYLA OLUŞTURULDU! 🎉');
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                            console.log('🏢 SALON BİLGİLERİ:');
                            console.log(`   📋 Salon Adı: ${salonData.name}`);
                            console.log(`   👤 Sahibi: ${salonData.owner_name}`);
                            console.log(`   📧 Email: ${salonData.email}`);
                            console.log(`   📱 Telefon: ${salonData.phone}`);
                            console.log(`   📍 Adres: ${salonData.address}`);
                            console.log(`   ✅ Durum: ONAYLANDI ve AKTİF`);
                            console.log(`   💎 Paket: ${salonData.subscription_status}\n`);

                            console.log('👤 GİRİŞ BİLGİLERİ:');
                            console.log(`   🔑 Kullanıcı Adı: zeynep`);
                            console.log(`   🔐 Şifre: admin123`);
                            console.log(`   👔 Rol: PATRON (Salon Sahibi)`);
                            console.log(`   🌐 Giriş URL: http://localhost:3000/login.html\n`);

                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                            // Tüm salonları listele
                            db.all('SELECT * FROM salons', [], (err, allSalons) => {
                                if (!err) {
                                    console.log(`📊 Toplam Salon Sayısı: ${allSalons.length}\n`);
                                    allSalons.forEach((salon, index) => {
                                        const status = salon.is_approved ? '✅ ONAYLANDI' : '⏳ BEKLEMEDE';
                                        const active = salon.is_active ? '🟢 AKTİF' : '🔴 PASİF';
                                        console.log(`${index + 1}. ${salon.name} - ${status} - ${active} - ${salon.subscription_status || 'FREE'}`);
                                    });
                                    console.log('');
                                }
                                process.exit(0);
                            });
                        }
                    );
                }
            );
        });

    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

createAndApproveSalon();
