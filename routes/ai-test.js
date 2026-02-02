// SIMPLE TEST - Does the endpoint work without Gemini?
const express = require('express');
const router = express.Router();

router.post('/public/chat', async (req, res) => {
    try {
        const { message } = req.body;

        console.log('Received message:', message);

        // Mock response - NO GEMINI
        res.json({
            success: true,
            response: `Test yanıt: "${message}" mesajını aldım! Veritabanı bağlantısı çalışıyor.`,
            suggestions: ['Randevu al', 'Fiyatları gör']
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Hata' });
    }
});

module.exports = router;
