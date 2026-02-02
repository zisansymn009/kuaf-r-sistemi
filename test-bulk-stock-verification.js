const axios = require('axios');

async function verifyBulkStock() {
    console.log('--- Verifying Bulk Stock API ---');
    try {
        // First, let's get existing stock to have a valid ID
        // Note: For simplicity, I'll assume ID 1 exists and salon ID is 1 (based on typical test data)
        // In a real verification, I'd need a token, but I'll check if the route is registered at least.

        console.log('Sending mock request to /api/patron/stock/bulk-count...');
        // This will fail with 401 Unauthorized because I don't have a token here, 
        // but it confirms the route is there (not 404).
        try {
            await axios.post('http://localhost:3000/api/patron/stock/bulk-count', {
                counts: []
            });
        } catch (err) {
            if (err.response && err.response.status === 401) {
                console.log('✅ Route found! (Received 401 Unauthorized as expected without token)');
            } else {
                console.log('❌ Unexpected response:', err.response ? err.response.status : err.message);
            }
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verifyBulkStock();
