
const axios = require('axios');
require('dotenv').config();

async function testDirect() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hi" }] }]
        });
        console.log('DIRECT SUCCESS:', JSON.stringify(response.data).substring(0, 100));
    } catch (e) {
        console.log('DIRECT FAILED:', e.response?.data || e.message);
    }
}

testDirect();
