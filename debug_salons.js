const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Salons ---');
db.all("SELECT id, salon_name FROM salons", (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);

    console.log('--- Patrons ---');
    db.all("SELECT id, full_name, salon_id FROM users WHERE role = 'PATRON'", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
        db.close();
    });
});
