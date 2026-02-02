const { initDatabase, getDb } = require('./database/db');
const bcrypt = require('bcryptjs');

async function checkAndFixPasswords() {
    try {
        await initDatabase();
        const db = getDb();

        console.log('\n🔍 Kullanıcı şifreleri kontrol ediliyor...\n');

        db.all('SELECT id, username, password, role FROM users', [], async (err, users) => {
            if (err) {
                console.error('❌ Hata:', err);
                process.exit(1);
            }

            console.log('📋 MEVCUT KULLANICILAR:\n');

            for (const user of users) {
                console.log(`ID: ${user.id} - ${user.username} (${user.role})`);
                console.log(`   Şifre Hash: ${user.password.substring(0, 20)}...`);

                // Şifre hash'i bcrypt formatında mı kontrol et
                const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
                console.log(`   Hash Formatı: ${isBcryptHash ? '✅ Geçerli' : '❌ Geçersiz'}`);

                // Test şifresi ile kontrol et
                try {
                    const isValid = await bcrypt.compare('admin123', user.password);
                    console.log(`   'admin123' ile giriş: ${isValid ? '✅ Çalışır' : '❌ Çalışmaz'}`);
                } catch (e) {
                    console.log(`   'admin123' ile giriş: ❌ Hash bozuk`);
                }
                console.log('');
            }

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('🔧 Tüm şifreleri "admin123" olarak sıfırlıyorum...\n');

            // Yeni hash oluştur
            const newHash = await bcrypt.hash('admin123', 10);
            console.log(`Yeni Hash: ${newHash}\n`);

            // Tüm kullanıcıların şifrelerini güncelle
            for (const user of users) {
                await new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE users SET password = ? WHERE id = ?',
                        [newHash, user.id],
                        (err) => {
                            if (err) {
                                console.error(`❌ ${user.username} güncellenemedi:`, err);
                                reject(err);
                            } else {
                                console.log(`✅ ${user.username} - Şifre güncellendi`);
                                resolve();
                            }
                        }
                    );
                });
            }

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎉 TÜM ŞİFRELER BAŞARIYLA GÜNCELLENDİ! 🎉');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            console.log('👤 GİRİŞ BİLGİLERİ:\n');
            users.forEach(user => {
                console.log(`${user.username}:`);
                console.log(`   🔑 Kullanıcı Adı: ${user.username}`);
                console.log(`   🔐 Şifre: admin123`);
                console.log(`   👔 Rol: ${user.role}\n`);
            });

            console.log('🌐 Giriş URL: http://localhost:3000/login.html\n');

            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

checkAndFixPasswords();
