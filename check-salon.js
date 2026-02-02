const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');
db.all("SELECT id, name, is_approved, is_active FROM salons", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
