const { initDatabase, getDb } = require('./database/db');
const bcrypt = require('bcryptjs');

async function createAliUser() {
    try {
        await initDatabase();
        const db = getDb();

        // Check if 'ali' user already exists
        db.get('SELECT id FROM users WHERE username = ?', ['ali'], async (err, existing) => {
            if (err) {
                console.error('Query error:', err);
                process.exit(1);
            }

            if (existing) {
                console.log('✅ User "ali" already exists!');
                process.exit(0);
            }

            // Create new user
            const hashedPassword = await bcrypt.hash('admin123', 10);

            db.run(
                'INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
                ['ali', hashedPassword, 'SUPER_ADMIN', 'Ali Koçak', 'ali@aura.com'],
                function (err) {
                    if (err) {
                        console.error('❌ Error creating user:', err);
                        process.exit(1);
                    }

                    console.log('✅ User "ali" created successfully!');
                    console.log('\nLogin credentials:');
                    console.log('  Username: ali');
                    console.log('  Password: admin123');
                    console.log('  Role: SUPER_ADMIN');
                    process.exit(0);
                }
            );
        });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAliUser();
