const db = require('./database/db');

async function migrate() {
    await db.initDatabase();
    console.log('🔄 Migrating services table...');

    try {
        await db.run('ALTER TABLE services ADD COLUMN oxidant_usage REAL DEFAULT 0');
        console.log('✅ Added oxidant_usage');
    } catch (e) {
        console.log('oxidant_usage exists or error:', e.message);
    }

    try {
        await db.run('ALTER TABLE services ADD COLUMN general_usage REAL DEFAULT 0');
        console.log('✅ Added general_usage');
    } catch (e) {
        console.log('general_usage exists or error:', e.message);
    }
}

migrate();
