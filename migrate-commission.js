const { query, run } = require('./database/db');

async function migrate() {
    try {
        console.log('🔄 Migration başlatılıyor...');

        // Check if column exists
        const tableInfo = await query("PRAGMA table_info(users)");
        const hasCommissionRate = tableInfo.some(col => col.name === 'commission_rate');

        if (!hasCommissionRate) {
            console.log('➕ commission_rate kolonu ekleniyor...');
            await run('ALTER TABLE users ADD COLUMN commission_rate REAL DEFAULT 0.15');
            console.log('✅ commission_rate kolonu eklendi');
        } else {
            console.log('ℹ️  commission_rate kolonu zaten mevcut');
        }

        console.log('✅ Migration tamamlandı!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration hatası:', error);
        process.exit(1);
    }
}

migrate();
