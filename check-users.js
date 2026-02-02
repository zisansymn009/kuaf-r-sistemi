const { initDatabase, getDb } = require('./database/db');

async function checkUsers() {
    try {
        await initDatabase();
        const db = getDb();

        db.all('SELECT id, username, role, full_name, salon_id FROM users', (err, users) => {
            if (err) {
                console.error('Query error:', err);
                process.exit(1);
            }

            console.log('\n=== USERS IN DATABASE ===');
            console.log(JSON.stringify(users, null, 2));

            if (users.length === 0) {
                console.log('\n⚠️ NO USERS FOUND! Database might be empty.');
                console.log('\nTo create a test user, run:');
                console.log('node -e "const db = require(\'./database/db\'); db.initDatabase().then(() => { const bcrypt = require(\'bcrypt\'); bcrypt.hash(\'admin123\', 10).then(hash => { db.getDb().run(\'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)\', [\'admin\', hash, \'SUPER_ADMIN\', \'Admin User\'], () => { console.log(\'User created!\'); process.exit(0); }); }); });"');
            }

            process.exit(0);
        });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
