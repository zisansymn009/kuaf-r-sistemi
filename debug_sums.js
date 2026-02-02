const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const dateStr = '2026-01-02';

db.all("SELECT transaction_type, SUM(amount) as total FROM transactions WHERE salon_id = 1 AND created_at >= ? GROUP BY transaction_type", [dateStr], (err, rows) => {
    if (err) console.error(err);
    else {
        console.log('Results:', rows);
    }
    db.close();
});
