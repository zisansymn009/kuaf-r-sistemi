const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const rootDbPath = path.join(__dirname, 'beautyflow.db');
const oldDbPath = path.join(__dirname, 'database', 'beautyflow.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

async function ensureSchema() {
    const db = new sqlite3.Database(rootDbPath);
    console.log('🔄 Checking root database schema...');

    return new Promise((resolve, reject) => {
        // Read schema
        const schema = fs.readFileSync(schemaPath, 'utf8');

        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Schema initialization error:', err.message);
                return reject(err);
            }
            console.log('✅ Schema initialized/checked.');

            // Check for missing columns
            db.all("PRAGMA table_info(users)", (err, rows) => {
                const cols = rows.map(r => r.name);
                if (!cols.includes('commission_rate')) {
                    console.log('➕ Adding commission_rate to users...');
                    db.run("ALTER TABLE users ADD COLUMN commission_rate REAL DEFAULT 0.15");
                }

                db.all("PRAGMA table_info(services)", (err, rows) => {
                    const sCols = rows.map(r => r.name);
                    if (!sCols.includes('is_active')) {
                        console.log('➕ Adding is_active to services...');
                        db.run("ALTER TABLE services ADD COLUMN is_active INTEGER DEFAULT 1");
                    }

                    db.close();
                    console.log('✅ Migration / Sync complete.');
                    resolve();
                });
            });
        });
    });
}

ensureSchema().catch(console.error);
