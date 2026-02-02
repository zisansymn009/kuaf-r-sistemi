const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('ERROR: JWT_SECRET not found in .env');
    process.exit(1);
}

const user = { id: 8, role: 'PATRON', salon_id: 4 };
const token = jwt.sign(user, secret);

const bodyData = JSON.stringify({
    message: 'bak bakalım',
    history: [
        { sender: 'user', text: 'selam' },
        { sender: 'model', text: 'Hoş geldin Ali. Bugün stoklara mı bakalım finansallara mı?' }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ai/patron/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(bodyData)
    }
};

console.log('Sending request to AI route...');

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Body:', body);
        try {
            const parsed = JSON.parse(body);
            if (parsed.success) {
                console.log('SUCCESS! AI Response:', parsed.response);
            }
        } catch (e) {
            console.log('Parse Error:', e.message);
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Request Error:', error.message);
    process.exit(1);
});

req.write(bodyData);
req.end();
