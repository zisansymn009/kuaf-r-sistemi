const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'beautyflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Fixing database schema...");

db.serialize(() => {
    // 1. Ensure UNIQUE constraint exists via INDEX
    // This supports INSERT OR REPLACE logic
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_working_hours_staff_day ON staff_working_hours(staff_id, day_of_week)", (err) => {
        if (err) {
            console.error("Index creation failed:", err);
        } else {
            console.log("✅ Verified/Created UNIQUE INDEX on staff_working_hours(staff_id, day_of_week)");
        }
    });

    // 2. Check for validation
    db.all("PRAGMA index_list(staff_working_hours)", (err, rows) => {
        if (rows) {
            console.log("Indexes on staff_working_hours:", rows);
        }
    });
});

db.close(() => console.log("Database closed."));
