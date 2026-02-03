const { Pool } = require('pg');
require('dotenv').config();

async function checkConnection() {
    console.log('🔍 Database Connection Diagnostic Tool');
    console.log('---------------------------------------');

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.error('❌ ERROR: DATABASE_URL is not set in .env or environment variables.');
        console.log('👉 ACTION: Make sure to add DATABASE_URL to your .env file or Render environment settings.');
        process.exit(1);
    }

    console.log('✅ DATABASE_URL found.');
    if (dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com')) {
        console.log('ℹ️ Detected Supabase PostgreSQL.');
    } else if (dbUrl.includes('render.com')) {
        console.log('ℹ️ Detected Render PostgreSQL.');
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('⏳ Connecting to database...');
        const res = await pool.query('SELECT NOW() as now, current_database() as db, version() as ver');
        console.log('✅ SUCCESS: Connected to PostgreSQL!');
        console.log('   - Time on Server:', res.rows[0].now);
        console.log('   - Database Name:', res.rows[0].db);
        console.log('   - PG Version:', res.rows[0].ver.split(',')[0]);

        console.log('\n📊 Checking Tables:');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        if (tables.rows.length === 0) {
            console.warn('⚠️ WARNING: Connected but no tables found. Initializing schema might be needed.');
        } else {
            console.log('✅ Found', tables.rows.length, 'tables:');
            console.log('   ', tables.rows.map(t => t.table_name).join(', '));
        }

        console.log('\n---------------------------------------');
        console.log('🚀 Your system is READY for PostgreSQL!');

    } catch (err) {
        console.error('❌ ERROR: Failed to connect to PostgreSQL.');
        console.error('   Details:', err.message);
        console.log('\n💡 TIPS:');
        console.log('1. Check if the connection string is correct.');
        console.log('2. Check if your database provider (Supabase/Render) allows connections from your current IP.');
        console.log('3. Ensure DATABASE_URL is exactly as provided by your provider.');
    } finally {
        await pool.end();
    }
}

checkConnection();
