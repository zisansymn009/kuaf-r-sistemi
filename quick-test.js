const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyBiPsTQW6xkkRErkGZlATZNwTnzdMBQKgg');

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Selam de.");
        console.log(`✅ ${modelName}: SUCCESS - ${result.response.text()}`);
    } catch (e) {
        console.log(`❌ ${modelName}: FAILED - ${e.status} ${e.message}`);
    }
}

async function run() {
    await testModel('gemini-2.0-flash');
    await testModel('gemini-2.5-flash');
}

run();
