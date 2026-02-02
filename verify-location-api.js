const http = require('http');

async function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function verify() {
    console.log('--- API VERIFICATION ---');
    try {
        const locations = await get('http://localhost:3000/api/public/locations');
        console.log('Locations:', JSON.stringify(locations, null, 2));

        const salons = await get('http://localhost:3000/api/public/salons?city=İstanbul');
        console.log('Salons (İstanbul):', JSON.stringify(salons, null, 2));
    } catch (e) {
        console.log('Verification failed:', e.message);
    }
}

verify();
