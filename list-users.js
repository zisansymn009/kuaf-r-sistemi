const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, username, role, full_name, email, phone, salon_id FROM users', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log('\n=== BEAUTYFLOW KULLANICI BILGILERI ===\n');

    rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Kullanici Adi: ${user.username}`);
        console.log(`Sifre: admin123`);
        console.log(`Rol: ${user.role}`);
        console.log(`Ad Soyad: ${user.full_name || '-'}`);
        console.log(`Email: ${user.email || '-'}`);
        console.log(`Telefon: ${user.phone || '-'}`);
        console.log(`Salon ID: ${user.salon_id || 'Super Admin'}`);
        console.log('-----------------------------------');
    });

    console.log(`\nToplam ${rows.length} kullanici\n`);
    console.log('Giris URL: http://localhost:3000/login.html\n');

    db.close();
});
