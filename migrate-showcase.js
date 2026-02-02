const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(DB_PATH);

const createShowcaseTable = `
CREATE TABLE IF NOT EXISTS salon_showcase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('campaign', 'service_sample')),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);`;

db.serialize(() => {
    db.run(createShowcaseTable, (err) => {
        if (err) {
            console.error('❌ Error creating salon_showcase table:', err.message);
        } else {
            console.log('✅ Table salon_showcase is ready');
        }
        db.close();
    });
});
