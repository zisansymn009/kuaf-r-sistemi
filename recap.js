const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

console.log('--- RECAP ---');
db.all("SELECT appointment_date, status, COUNT(*) as count FROM appointments GROUP BY appointment_date, status", (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    db.close();
});
