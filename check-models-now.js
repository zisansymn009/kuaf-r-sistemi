
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // There isn't a direct listModels in the client library easily accessible sometimes
        // But we can try to use gemini-pro which is the most stable name
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent("test");
        console.log('gemini-pro SUCCESS');
    } catch (e) {
        console.log('gemini-pro FAILED:', e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("test");
        console.log('gemini-1.5-flash SUCCESS');
    } catch (e) {
        console.log('gemini-1.5-flash FAILED:', e.message);
    }
}

listModels();
