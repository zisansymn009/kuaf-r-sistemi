const axios = require('axios');

async function testRegister() {
    try {
        console.log('Testing salon registration...');

        const response = await axios.post('http://localhost:3000/api/auth/register-salon', {
            salonName: 'Test Kuaför Salonu',
            ownerName: 'Ahmet Yılmaz',
            address: 'Test Mahallesi, Test Sokak No:1',
            phone: '5551234567',
            email: 'test@kuafor.com',
            username: 'testkullanici' + Date.now(),
            password: 'test123456'
        });

        console.log('✅ Registration successful:', response.data);

        // Check database
        const db = require('./database/db');
        await db.initDatabase();

        const pending = await db.query('SELECT * FROM salons WHERE is_approved = 0');
        console.log('\n📋 Pending salons:', JSON.stringify(pending, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }

    process.exit(0);
}

testRegister();
