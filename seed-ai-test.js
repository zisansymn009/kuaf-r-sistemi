const { initDatabase, run } = require('./database/db');

async function seedTestData() {
    try {
        await initDatabase();
        const salonId = 4; // ali's salon

        console.log('🌱 Seeding test data for Salon ID: 4...');

        // 1. Add some stocks
        await run('DELETE FROM stock WHERE salon_id = ?', [salonId]);
        await run(`INSERT INTO stock (salon_id, item_name, item_type, quantity, unit, unit_cost, min_quantity) 
                   VALUES (?, 'Loreal 7.1 Küllü Kumral', 'dye', 15, 'adet', 120, 5)`, [salonId]);
        await run(`INSERT INTO stock (salon_id, item_name, item_type, quantity, unit, unit_cost, min_quantity) 
                   VALUES (?, 'Wella Oksidan %6', 'other', 2, 'litre', 250, 1)`, [salonId]);
        await run(`INSERT INTO stock (salon_id, item_name, item_type, quantity, unit, unit_cost, min_quantity) 
                   VALUES (?, 'Profesyonel Şampuan', 'shampoo', 500, 'gr', 85, 1000)`, [salonId]); // Critical low!

        // 2. Add a staff
        await run('UPDATE users SET role = "STAFF" WHERE username = "teststaff" AND salon_id = 4');

        // 3. Add a completed appointment for records
        // First get a service id
        const service = await run(`INSERT INTO services (salon_id, name, price, duration, category) 
                                   VALUES (?, 'Saç Boyama', 850, 90, 'Boya')`, [salonId]);

        const staff = { id: 8 }; // Based on previous check

        await run(`INSERT INTO appointments (salon_id, service_id, staff_id, customer_name, customer_phone, appointment_date, appointment_time, status, completed_at)
                   VALUES (?, ?, ?, 'Ayşe Yılmaz', '5051112233', date('now', '-1 day'), '14:30', 'completed', datetime('now', '-1 day'))`,
            [salonId, service.id, staff.id]);

        console.log('✅ Seeding complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        process.exit();
    }
}

seedTestData();
