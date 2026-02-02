const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');
db.get("SELECT date('2026-02-01T15:13:41.217Z') as d", (err, row) => {
    console.log('Parsed date:', row.d);
    db.close();
});
