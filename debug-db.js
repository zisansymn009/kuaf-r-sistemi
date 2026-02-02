const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');

db.all("SELECT * FROM services", (err, services) => {
    console.log('--- SERVICES ---');
    console.log(JSON.stringify(services, null, 2));
    db.all("SELECT id, username, role, salon_id FROM users", (err, users) => {
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2));
        db.close();
    });
});
