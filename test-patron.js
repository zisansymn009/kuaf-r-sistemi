const axios = require('axios');

async function testPatronDashboard() {
    try {
        console.log('🧪 Testing Patron Dashboard\n');

        const db = require('./database/db');
        const bcrypt = require('bcryptjs');

        await db.initDatabase();

        // Create patron user if doesn't exist
        const existingPatron = await db.queryOne('SELECT id FROM users WHERE username = ?', ['patron1']);

        if (!existingPatron) {
            console.log('Creating test patron user...');
            const hash = await bcrypt.hash('patron123', 10);

            // Get or create salon
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
                ['patron1', hash, 'PATRON', 'Test Patron', salon.id]
            );
            console.log('✅ Patron user created');
        }

        // Login
        console.log('\n1️⃣ Logging in as patron1...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'patron1',
            password: 'patron123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Test salon-info
        console.log('\n2️⃣ Fetching salon info...');
        const salonResponse = await axios.get('http://localhost:3000/api/patron/salon-info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Salon:', salonResponse.data.salon);

        // Test stats
        console.log('\n3️⃣ Fetching stats...');
        const statsResponse = await axios.get('http://localhost:3000/api/patron/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Stats:', statsResponse.data);

        // Test appointments
        console.log('\n4️⃣ Fetching appointments...');
        const appointmentsResponse = await axios.get('http://localhost:3000/api/patron/appointments?limit=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Found ${appointmentsResponse.data.appointments.length} appointments`);

        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('\n❌ Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }

    process.exit(0);
}

testPatronDashboard();
