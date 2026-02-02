const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, amount, transaction_type, created_at FROM transactions WHERE salon_id = 1", (err, rows) => {
    if (err) console.error(err);
    else {
        rows.forEach(r => console.log(`${r.id}: ${r.transaction_type} ${r.amount} (${r.created_at})`));
    }
    db.close();
});
