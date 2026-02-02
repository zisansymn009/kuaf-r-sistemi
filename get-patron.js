const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');
db.all("SELECT username, role, salon_id, full_name FROM users WHERE username = 'seymen'", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
