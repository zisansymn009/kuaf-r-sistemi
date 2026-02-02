const db = require('./database/db');

async function migrate() {
    await db.initDatabase();
    console.log('🔄 Migrating salons table for location features...');

    try {
        await db.run('ALTER TABLE salons ADD COLUMN city TEXT');
        console.log('✅ Added city column');
    } catch (e) {
        console.log('City column might already exist:', e.message);
    }

    try {
        await db.run('ALTER TABLE salons ADD COLUMN district TEXT');
        console.log('✅ Added district column');
    } catch (e) {
        console.log('District column might already exist:', e.message);
    }

    // Test verisi güncellemesi (Salon id=1 için)
    try {
        await db.run('UPDATE salons SET city = "İstanbul", district = "Beşiktaş" WHERE id = 1');
        console.log('✅ Test salon location updated');
    } catch (e) {
        console.log('Failed to update test salon:', e.message);
    }
}

migrate();
