const db = require('./database/db');

async function seedStaffData() {
    try {
        await db.initDatabase();

        // Get staff1 user
        const staff = await db.queryOne('SELECT id, salon_id FROM users WHERE username = ?', ['staff1']);

        if (!staff) {
            console.log('❌ Staff user not found. Run test-staff.js first.');
            process.exit(1);
        }

        console.log('✅ Found staff:', staff);

        // Create a service if doesn't exist
        let service = await db.queryOne('SELECT id FROM services WHERE salon_id = ?', [staff.salon_id]);

        if (!service) {
            const serviceResult = await db.run(
                'INSERT INTO services (salon_id, name, category, price, duration, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                [staff.salon_id, 'Saç Kesimi', 'Kesim', 150, 30]
            );
            service = { id: serviceResult.id };
            console.log('✅ Created service');
        }

        // Create today's appointments
        const today = new Date().toISOString().split('T')[0];

        const appointments = [
            { time: '10:00', customer: 'Ayşe Yılmaz', phone: '05551234567' },
            { time: '11:30', customer: 'Fatma Demir', phone: '05559876543' },
            { time: '14:00', customer: 'Zeynep Kaya', phone: '05555555555' }
        ];

        for (const apt of appointments) {
            // Check if already exists
            const existing = await db.queryOne(
                'SELECT id FROM appointments WHERE staff_id = ? AND appointment_date = ? AND appointment_time = ?',
                [staff.id, today, apt.time]
            );

            if (!existing) {
                await db.run(
                    `INSERT INTO appointments (salon_id, staff_id, service_id, customer_name, customer_phone, appointment_date, appointment_time, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [staff.salon_id, staff.id, service.id, apt.customer, apt.phone, today, apt.time]
                );
                console.log(`✅ Created appointment: ${apt.time} - ${apt.customer}`);
            }
        }

        console.log('\n✅ Staff data seeded successfully!');
        console.log('📅 Today\'s date:', today);
        console.log('👤 Staff ID:', staff.id);
        console.log('🏢 Salon ID:', staff.salon_id);

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

seedStaffData();
