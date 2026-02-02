const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('beautyflow.db');

async function getSalonInfo(salonId) {
    return new Promise((resolve, reject) => {
        const info = {};
        db.all("SELECT id, name, price, duration FROM services WHERE salon_id = ? AND is_active = 1", [salonId], (err, services) => {
            if (err) return reject(err);
            info.services = services;
            db.all("SELECT id, full_name FROM users WHERE salon_id = ? AND role = 'STAFF' AND is_active = 1", [salonId], (err, staff) => {
                if (err) return reject(err);
                info.staff = staff;
                resolve(info);
            });
        });
    });
}

getSalonInfo(1).then(info => {
    console.log(JSON.stringify(info, null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
