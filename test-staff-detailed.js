const axios = require('axios');

async function testStaffDashboardDetailed() {
    try {
        console.log('🧪 Testing Staff Dashboard - Detailed\n');

        // Login
        console.log('1️⃣ Logging in as staff1...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'staff1',
            password: 'staff123'
        });

        const token = loginResponse.data.token;
        const user = loginResponse.data.user;
        console.log('✅ Login successful');
        console.log('   User:', user);

        // Test appointments endpoint
        const today = new Date().toISOString().split('T')[0];
        console.log(`\n2️⃣ Fetching appointments for ${today}...`);

        const appointmentsResponse = await axios.get(
            `http://localhost:3000/api/staff/appointments?date=${today}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        console.log('✅ Appointments response:');
        console.log(JSON.stringify(appointmentsResponse.data, null, 2));

        // Check if appointments array exists
        if (appointmentsResponse.data.appointments) {
            console.log(`\n📅 Found ${appointmentsResponse.data.appointments.length} appointments`);
            appointmentsResponse.data.appointments.forEach((apt, i) => {
                console.log(`   ${i + 1}. ${apt.appointment_time} - ${apt.customer_name} (${apt.service_name || 'No service'})`);
            });
        } else {
            console.log('\n⚠️ No appointments array in response!');
        }

        // Test dashboard endpoint
        console.log('\n3️⃣ Testing dashboard endpoint...');
        const dashboardResponse = await axios.get(
            'http://localhost:3000/api/staff/dashboard',
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        console.log('✅ Dashboard response:');
        console.log(JSON.stringify(dashboardResponse.data, null, 2));

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

testStaffDashboardDetailed();
