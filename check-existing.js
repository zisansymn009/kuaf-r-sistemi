const { initDatabase, getDb } = require('./database/db');

async function checkExisting() {
    try {
        await initDatabase();
        const db = getDb();

        console.log('\n=== MEVCUT SALONLAR ===\n');
        db.all('SELECT * FROM salons', [], (err, salons) => {
            if (!err) {
                salons.forEach(s => {
                    console.log(`ID: ${s.id} - ${s.name} - ${s.owner_name} - ${s.email}`);
                });
            }

            console.log('\n=== MEVCUT KULLANICILAR ===\n');
            db.all('SELECT id, username, role, full_name, email, salon_id FROM users', [], (err, users) => {
                if (!err) {
                    users.forEach(u => {
                        console.log(`ID: ${u.id} - ${u.username} - ${u.role} - ${u.full_name} - Salon: ${u.salon_id || 'N/A'}`);
                    });
                }
                console.log('');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

checkExisting();
