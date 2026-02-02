const axios = require('axios');

async function testStaffDashboard() {
    try {
        // First, create a staff user if doesn't exist
        const db = require('./database/db');
        const bcrypt = require('bcryptjs');

        await db.initDatabase();

        // Check if staff exists
        const existingStaff = await db.queryOne('SELECT id FROM users WHERE username = ?', ['staff1']);

        if (!existingStaff) {
            console.log('Creating test staff user...');
            const hash = await bcrypt.hash('staff123', 10);

            // First create or get a salon
            let salon = await db.queryOne('SELECT id FROM salons WHERE is_approved = 1 LIMIT 1');
            if (!salon) {
                const salonResult = await db.run(
                    'INSERT INTO salons (name, owner_name, is_approved, is_active) VALUES (?, ?, 1, 1)',
                    ['Test Salon', 'Test Owner']
                );
                salon = { id: salonResult.id };
            }

            await db.run(
                'INSERT INTO users (username, password, role, full_name, salon_id, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                ['staff1', hash, 'STAFF', 'Test Personel', salon.id]
            );
            console.log('✅ Staff user created');
        }

        // Login as staff
        console.log('\n1. Logging in as staff...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'staff1',
            password: 'staff123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Test dashboard endpoint
        console.log('\n2. Fetching staff dashboard...');
        const dashboardResponse = await axios.get('http://localhost:3000/api/staff/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));

        // Test appointments endpoint
        console.log('\n3. Fetching appointments...');
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await axios.get(`http://localhost:3000/api/staff/appointments?date=${today}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Appointments:', JSON.stringify(appointmentsResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
    }

    process.exit(0);
}

testStaffDashboard();
