const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in .env');
        return;
    }

    console.log('🌍 Connecting to PostgreSQL...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Adding missing columns to services table...');

        try {
            await pool.query('ALTER TABLE services ADD COLUMN oxidant_usage REAL DEFAULT 0');
            console.log('✅ Added oxidant_usage');
        } catch (e) {
            console.log('ℹ️ oxidant_usage already exists or alternative error:', e.message);
        }

        try {
            await pool.query('ALTER TABLE services ADD COLUMN general_usage REAL DEFAULT 0');
            console.log('✅ Added general_usage');
        } catch (e) {
            console.log('ℹ️ general_usage already exists or alternative error:', e.message);
        }

        console.log('🎉 Migration completed successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
