const { initDatabase, run } = require('./database/db');

async function migrate() {
    try {
        await initDatabase();
        console.log('✅ Database initialized');

        // Add featured columns to salons table
        console.log('Adding featured columns to salons table...');
        await run('ALTER TABLE salons ADD COLUMN is_featured INTEGER DEFAULT 0').catch(() => console.log('Column is_featured already exists'));
        await run('ALTER TABLE salons ADD COLUMN featured_until TEXT').catch(() => console.log('Column featured_until already exists'));
        await run('ALTER TABLE salons ADD COLUMN featured_count INTEGER DEFAULT 0').catch(() => console.log('Column featured_count already exists'));

        // Create featured_requests table
        console.log('Creating featured_requests table...');
        await run(`
            CREATE TABLE IF NOT EXISTS featured_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                requested_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                duration_days INTEGER DEFAULT 7,
                approved_by INTEGER,
                approved_at TEXT,
                notes TEXT,
                FOREIGN KEY (salon_id) REFERENCES salons(id),
                FOREIGN KEY (approved_by) REFERENCES users(id)
            )
        `);

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
