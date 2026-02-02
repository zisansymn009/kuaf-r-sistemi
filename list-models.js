const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // We can't list models with the client SDK easily without the manager
        // But we can try the most likely working one based on previous success
        const models = ['gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-1.5-flash-latest'];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const res = await model.generateContent('ping');
                console.log(`✅ ${m}: SUCCESS`);
            } catch (e) {
                console.log(`❌ ${m}: ${e.status} ${e.message}`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

listModels();
