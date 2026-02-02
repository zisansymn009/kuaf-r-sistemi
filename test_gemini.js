require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function testVisionV25() {
    console.log('--- GEMINI 2.5 FLASH VISION TEST ---');
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Using the user's uploaded image for testing
        const imagePath = 'C:/Users/pc/.gemini/antigravity/brain/21b9b40b-d080-4153-a5e5-c9c72910c39a/uploaded_media_1_1769982244798.png';
        if (!fs.existsSync(imagePath)) {
            console.error('❌ Image file not found for test');
            return;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        };

        console.log('Sending Vision request...');
        const result = await model.generateContent(["Bu saçı analiz et.", imagePart]);
        console.log('✅ Vision Response:', result.response.text());

    } catch (error) {
        console.error('❌ VISION TEST FAILED', error.message);
    }
}

testVisionV25();
