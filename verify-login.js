const { initDatabase, getDb } = require('./database/db');
const bcrypt = require('bcryptjs');

async function verifyLogin() {
    try {
        await initDatabase();
        const db = getDb();

        console.log('\n=== GIRIS DOGRULAMA TESTI ===\n');

        db.all('SELECT id, username, password, role, full_name FROM users', [], async (err, users) => {
            if (err) {
                console.error('Hata:', err);
                process.exit(1);
            }

            for (const user of users) {
                const testPassword = 'admin123';
                const isValid = await bcrypt.compare(testPassword, user.password);

                const status = isValid ? 'CALISIR' : 'CALISMAZ';
                const icon = isValid ? '✅' : '❌';

                console.log(`${icon} ${user.username} - ${status}`);
                console.log(`   Kullanici Adi: ${user.username}`);
                console.log(`   Sifre: admin123`);
                console.log(`   Rol: ${user.role}`);
                console.log(`   Ad Soyad: ${user.full_name}`);
                console.log('');
            }

            console.log('Giris URL: http://localhost:3000/login.html\n');
            process.exit(0);
        });

    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

verifyLogin();
