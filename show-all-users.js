const { initDatabase, getDb } = require('./database/db');

async function showAllUsers() {
    try {
        await initDatabase();
        const db = getDb();

        db.all('SELECT * FROM users', (err, users) => {
            if (err) {
                console.error('❌ Query error:', err);
                process.exit(1);
            }

            console.log('\n╔════════════════════════════════════════════════════════════════╗');
            console.log('║              BEAUTYFLOW - TÜM KULLANICILAR                     ║');
            console.log('╚════════════════════════════════════════════════════════════════╝\n');

            if (users.length === 0) {
                console.log('⚠️  Veritabanında kullanıcı bulunamadı!\n');
                process.exit(0);
            }

            users.forEach((user, index) => {
                console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`👤 KULLANICI #${index + 1}`);
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`📋 ID:           ${user.id}`);
                console.log(`👤 Kullanıcı Adı: ${user.username}`);
                console.log(`🔑 Şifre:         admin123 (tüm kullanıcılar için)`);
                console.log(`👔 Rol:           ${user.role}`);
                console.log(`📝 Ad Soyad:      ${user.full_name || 'Belirtilmemiş'}`);
                console.log(`🏢 Salon ID:      ${user.salon_id || 'Yok (Super Admin)'}`);
                console.log(`📧 Email:         ${user.email || 'Belirtilmemiş'}`);
                console.log(`📱 Telefon:       ${user.phone || 'Belirtilmemiş'}`);
            });

            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`\n✅ Toplam ${users.length} kullanıcı bulundu.\n`);
            console.log(`🌐 Giriş URL: http://localhost:3000/login.html\n`);
            
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

showAllUsers();
