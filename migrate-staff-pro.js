const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'beautyflow.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

async function migrate() {
    console.log('🚀 Starting advanced staff management migration...');
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        const schema = fs.readFileSync(schemaPath, 'utf8');

        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Migration error:', err.message);
                reject(err);
            } else {
                console.log('✅ New tables created/verified successfully.');
                db.close();
                resolve();
            }
        });
    });
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
