
const axios = require('axios');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await axios.get(url);
        console.log('--- MODEL NAMES ---');
        response.data.models.forEach(m => console.log(m.name));
    } catch (e) {
        console.log('FAILED TO LIST:', e.response?.data || e.message);
    }
}

listModels();
