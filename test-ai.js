
const aiService = require('./services/ai-service');

async function test() {
    console.log('Testing AI Service...');
    try {
        const result = await aiService.customerChat('Merhaba, nasılsın?', [], { userName: 'Test' });
        console.log('RESULT:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.log('CATCH ERROR:', e.message);
    }
}

test();
