// Test login with API directly
const axios = require('axios');

async function testLogin() {
    const users = [
        { username: 'superadmin', password: 'admin123', name: 'Super Admin' },
        { username: 'ali', password: 'admin123', name: 'Ali Koçak' },
        { username: 'testsalon', password: 'admin123', name: 'Test Salon' },
        { username: 'zeynep', password: 'admin123', name: 'Zeynep Demir' }
    ];

    console.log('\n=== LOGIN API TESTI ===\n');
    console.log('API URL: http://localhost:3000/api/auth/login\n');

    for (const user of users) {
        try {
            console.log(`Testing: ${user.name} (${user.username})`);

            const response = await axios.post('http://localhost:3000/api/auth/login', {
                username: user.username,
                password: user.password
            });

            if (response.data.success) {
                console.log(`✅ BASARILI - ${user.username}`);
                console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
                console.log(`   Rol: ${response.data.user.role}`);
                console.log(`   Ad: ${response.data.user.full_name}`);
            } else {
                console.log(`❌ BASARISIZ - ${user.username}`);
            }
        } catch (error) {
            console.log(`❌ HATA - ${user.username}`);
            if (error.response) {
                console.log(`   Hata Mesaji: ${error.response.data.error}`);
                console.log(`   Status Code: ${error.response.status}`);
            } else {
                console.log(`   Hata: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('=== TEST TAMAMLANDI ===\n');
}

testLogin();
