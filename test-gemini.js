const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
    console.log('API Key:', process.env.GEMINI_API_KEY);
    console.log('');

    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-2.5-flash'
    ];

    for (const modelName of models) {
        try {
            console.log(`Testing: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            console.log(`✅ SUCCESS: ${modelName}`);
        } catch (error) {
            console.log(`❌ FAILED: ${modelName} - Status: ${error.status || 'Unknown'}`);
            if (error.status === 404) console.log('   Reason: Model not found');
            if (error.status === 429) console.log('   Reason: Rate limit exceeded');
        }
        console.log('-------------------');
    }
}

testGemini();
