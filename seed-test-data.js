const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'beautyflow.db'));

db.serialize(() => {
    // Salon
    db.run('INSERT OR IGNORE INTO salons (id, name, address, phone) VALUES (1, "Test Salon", "Test Address", "05554443322")');

    // Hash for admin123
    const hp = "$2a$10$cInQ8pcGyZy3/bquy1nZl..4ewpMwFsoXietwjA4RYdXY.XjxKuR2";

    // Patron
    db.run('INSERT OR IGNORE INTO users (username, password, role, full_name, salon_id, is_active) VALUES ("testpatron", ?, "PATRON", "Test Patron", 1, 1)', [hp]);

    // Staff
    db.run('INSERT OR IGNORE INTO users (username, password, role, full_name, salon_id, is_active, commission_rate) VALUES ("teststaff", ?, "STAFF", "Test Staff", 1, 1, 0.15)', [hp]);

    // Service
    db.run('INSERT OR IGNORE INTO services (salon_id, name, price, duration, category, is_active) VALUES (1, "Kesim", 250, 30, "Saç", 1)');
});

db.close((err) => {
    if (err) console.error(err);
    else console.log('✅ Test data inserted successfully');
});
