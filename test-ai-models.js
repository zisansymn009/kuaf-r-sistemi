const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'demo-key') {
        console.error('❌ API Key is missing or default!');
        return;
    }

    console.log('Using API Key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Try a simple generation to check model availability
        const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

        for (const modelName of modelsToTry) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Say 'AURA is ready' in 3 words.");
                console.log(`✅ ${modelName} works! Result:`, result.response.text());
                break; // If one works, we are good to know
            } catch (err) {
                console.error(`❌ ${modelName} failed:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    }
}

checkModels();
