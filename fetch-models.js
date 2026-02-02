const https = require('https');
require('dotenv').config();

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('--- AVAILABLE MODELS ---');
                json.models.forEach(m => console.log(m.name));
            } else {
                console.log('No models found in response.');
            }
        } catch (e) {
            console.error('Failed to parse response:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
