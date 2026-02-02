const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const today = new Date().toLocaleDateString('sv-SE');
console.log('Today:', today);

const sql = `
    SELECT a.id, a.appointment_date, a.status, a.salon_id, a.service_id, s.name as service_name 
    FROM appointments a 
    LEFT JOIN services s ON a.service_id = s.id 
    WHERE a.appointment_date = ?
`;

db.all(sql, [today], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Appointments for ${today} (${rows.length}):`);
        console.table(rows);

        // Check if any have null service_name but non-null service_id
        const orphans = rows.filter(r => r.service_id && !r.service_name);
        if (orphans.length > 0) {
            console.log('WARNING: Found appointments with invalid service_id:');
            console.table(orphans);
        }
    }
    db.close();
});
