const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
console.log('Date Limit:', dateStr);

db.all("SELECT * FROM transactions WHERE salon_id = 1 AND created_at >= ?", [dateStr], (err, rows) => {
    if (err) console.error(err);
    else {
        console.log(`Transactions since ${dateStr}:`, rows.length);
        console.table(rows.map(r => ({
            id: r.id,
            type: r.transaction_type,
            amount: r.amount,
            date: r.created_at
        })));
    }
    db.close();
});
