const { initDatabase, query } = require('./database/db');

async function verify() {
    try {
        await initDatabase();

        console.log('\n--- USERS ---');
        const users = await query('SELECT id, username, role, is_active, salon_id FROM users');
        console.table(users);

        console.log('\n--- SALONS ---');
        const salons = await query('SELECT id, name, is_approved, is_active FROM salons');
        console.table(salons);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verify();
