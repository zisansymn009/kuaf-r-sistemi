const { run, query } = require('./database/db');

async function migrateMissingTables() {
    try {
        console.log('🔧 Starting database migration...\n');

        // 1. Commissions (Prim Sistemi)
        console.log('Creating commissions table...');
        await run(`
            CREATE TABLE IF NOT EXISTS commissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER NOT NULL,
                appointment_id INTEGER NOT NULL,
                commission_amount REAL NOT NULL,
                date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES users(id),
                FOREIGN KEY (appointment_id) REFERENCES appointments(id)
            )
        `);
        console.log('✅ Commissions table created');

        // 2. Staff Advances (Avans Sistemi)
        console.log('Creating staff_advances table...');
        await run(`
            CREATE TABLE IF NOT EXISTS staff_advances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                date DATE NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Staff advances table created');

        // 3. Customer Records (Müşteri Kayıtları)
        console.log('Creating customer_records table...');
        await run(`
            CREATE TABLE IF NOT EXISTS customer_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                staff_id INTEGER,
                is_regular INTEGER DEFAULT 0,
                last_visit DATETIME,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salon_id) REFERENCES salons(id),
                FOREIGN KEY (staff_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Customer records table created');

        // 4. Dye Formulas (Boya Reçeteleri)
        console.log('Creating dye_formulas table...');
        await run(`
            CREATE TABLE IF NOT EXISTS dye_formulas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_record_id INTEGER NOT NULL,
                appointment_id INTEGER,
                formula_details TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_record_id) REFERENCES customer_records(id),
                FOREIGN KEY (appointment_id) REFERENCES appointments(id)
            )
        `);
        console.log('✅ Dye formulas table created');

        // 5. Featured Requests (Featured Başvuruları)
        console.log('Creating featured_requests table...');
        await run(`
            CREATE TABLE IF NOT EXISTS featured_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reviewed_at DATETIME,
                reviewed_by INTEGER,
                notes TEXT,
                FOREIGN KEY (salon_id) REFERENCES salons(id),
                FOREIGN KEY (reviewed_by) REFERENCES users(id)
            )
        `);
        console.log('✅ Featured requests table created');

        // 6. Revenues (Gelirler)
        console.log('Creating revenues table...');
        await run(`
            CREATE TABLE IF NOT EXISTS revenues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                appointment_id INTEGER,
                amount REAL NOT NULL,
                date DATE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salon_id) REFERENCES salons(id),
                FOREIGN KEY (appointment_id) REFERENCES appointments(id)
            )
        `);
        console.log('✅ Revenues table created');

        // 7. Expenses (Giderler)
        console.log('Creating expenses table...');
        await run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salon_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (salon_id) REFERENCES salons(id)
            )
        `);
        console.log('✅ Expenses table created');

        console.log('\n🎉 Migration completed successfully!\n');

        // Verify tables
        console.log('Verifying tables...');
        const tables = await query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `);

        console.log('\n📊 Database Tables:');
        tables.forEach(t => console.log(`  - ${t.name}`));

        console.log('\n✅ All tables verified!');

    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

// Run migration
const db = require('./database/db');
db.initDatabase()
    .then(() => migrateMissingTables())
    .then(() => {
        console.log('\n✅ Database is ready!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
