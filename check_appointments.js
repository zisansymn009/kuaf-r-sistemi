const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const today = new Date().toISOString().split('T')[0];
console.log('Today (UTC):', today);

db.all("SELECT id, appointment_date, appointment_time, customer_name, status FROM appointments ORDER BY id DESC LIMIT 10", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Last 10 appointments:');
        console.table(rows);
    }
    db.close();
});
