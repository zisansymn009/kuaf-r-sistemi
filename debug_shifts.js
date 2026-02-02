const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking schema for staff_working_hours...");
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='staff_working_hours'", [], (err, row) => {
    if (err) return console.error(err);
    if (!row) {
        console.log("Table not found!");
    } else {
        console.log("SQL:", row.sql);
    }
    db.close();
});
