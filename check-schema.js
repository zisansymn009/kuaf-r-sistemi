const { initDatabase, getDb } = require('./database/db');

async function checkSchema() {
    try {
        await initDatabase();
        const db = getDb();

        db.all("PRAGMA table_info(salons)", [], (err, columns) => {
            if (err) {
                console.error('❌ Hata:', err);
                process.exit(1);
            }

            console.log('\n📋 SALONS TABLOSU YAPISI:\n');
            columns.forEach(col => {
                console.log(`- ${col.name} (${col.type})`);
            });
            console.log('');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

checkSchema();
