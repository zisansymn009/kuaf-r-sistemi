const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const today = new Date().toLocaleDateString('sv-SE');
console.log('Today (sv-SE):', today);

db.all("SELECT id, appointment_date, status, customer_name, service_id FROM appointments", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('All appointments:');
        console.table(rows);

        const todayRows = rows.filter(r => r.appointment_date === today);
        console.log(`Appointments for ${today}:`, todayRows.length);
        console.table(todayRows);
    }
    db.close();
});
