const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

const queryOne = (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

async function test() {
    const salonId = 1;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const revenueResult = await queryOne(
        `SELECT SUM(amount) as total FROM transactions WHERE salon_id = ? AND transaction_type = 'income' AND created_at >= ?`,
        [salonId, dateStr]
    );

    const expenseResult = await queryOne(
        `SELECT SUM(amount) as total FROM transactions WHERE salon_id = ? AND transaction_type = 'expense' AND created_at >= ?`,
        [salonId, dateStr]
    );

    const revenueData = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('sv-SE');

        const dayRevenue = await queryOne(
            `SELECT SUM(amount) as total FROM transactions WHERE salon_id = ? AND transaction_type = 'income' AND date(created_at) = ?`,
            [salonId, dateStr]
        );
        revenueData.push(dayRevenue?.total || 0);
        labels.push(dateStr);
    }

    console.log('Stats:', {
        rev: revenueResult.total,
        exp: expenseResult.total,
        profit: revenueResult.total - expenseResult.total
    });
    console.log('RevData:', revenueData);
    console.log('Labels:', labels);
    db.close();
}

test();
