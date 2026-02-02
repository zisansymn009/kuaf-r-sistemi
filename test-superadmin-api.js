const axios = require('axios');

async function testSuperAdminAPI() {
    try {
        // First login as superadmin
        console.log('1. Logging in as SuperAdmin...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        // Test pending salons endpoint
        console.log('\n2. Fetching pending salons...');
        const pendingResponse = await axios.get('http://localhost:3000/api/superadmin/salons/pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Pending salons:', JSON.stringify(pendingResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }

    process.exit(0);
}

testSuperAdminAPI();
