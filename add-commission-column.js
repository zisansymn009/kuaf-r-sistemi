const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'beautyflow.db'));

console.log('🔄 Migration başlatılıyor...');

db.run('ALTER TABLE users ADD COLUMN commission_rate REAL DEFAULT 0.15', (err) => {
    if (err) {
        if (err.message.includes('duplicate column')) {
            console.log('ℹ️  commission_rate kolonu zaten mevcut');
        } else {
            console.error('❌ Hata:', err.message);
        }
    } else {
        console.log('✅ commission_rate kolonu eklendi');
    }
    db.close();
    console.log('✅ Migration tamamlandı!');
});
