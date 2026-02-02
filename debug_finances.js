const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM transactions WHERE salon_id = 1", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log('--- Transactions for Salon 1 ---');
        console.table(rows.map(r => ({
            id: r.id,
            type: r.transaction_type,
            amount: r.amount,
            date: r.created_at
        })));

        const income = rows.filter(r => r.transaction_type === 'income').reduce((s, r) => s + r.amount, 0);
        const expense = rows.filter(r => r.transaction_type === 'expense').reduce((s, r) => s + r.amount, 0);
        console.log('Total Income:', income);
        console.log('Total Expense:', expense);
        console.log('Net Profit:', income - expense);
    }
    db.close();
});
