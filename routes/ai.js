const express = require('express');
const aiService = require('../services/ai-service');
const { query, queryOne } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Public Customer AI Chat
 * For landing page visitors
 */
router.post('/public/chat', async (req, res) => {
    try {
        const { message, sessionId, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mesaj gerekli' });
        }

        // Build context for customer AI
        const context = {
            salons: await query('SELECT id, name, address, phone FROM salons WHERE is_approved = 1 AND is_active = 1'),
            services: await query('SELECT id, name, category, price, duration FROM services WHERE is_active = 1 LIMIT 20'),
            staff: await query("SELECT id, full_name FROM users WHERE role = 'STAFF' AND is_active = 1")
        };

        // Check if message contains a date and calculate availability
        const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})|yarın|bugün/i);
        if (dateMatch) {
            let requestedDate;
            const today = new Date();

            if (dateMatch[0].toLowerCase() === 'bugün') {
                requestedDate = today.toISOString().split('T')[0];
            } else if (dateMatch[0].toLowerCase() === 'yarın') {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                requestedDate = tomorrow.toISOString().split('T')[0];
            } else {
                requestedDate = dateMatch[1];
            }

            // Get appointments for that date
            const dayAppointments = await query(
                'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND salon_id = 1',
                [requestedDate]
            );

            // Generate available slots (9:00 - 18:00, 1-hour intervals)
            const allSlots = [];
            for (let hour = 9; hour <= 18; hour++) {
                allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            }

            const bookedTimes = dayAppointments.map(a => a.appointment_time);
            const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

            context.availableSlots = availableSlots;
            context.requestedDate = requestedDate;
        }

        const result = await aiService.customerChat(message, history, context);

        // Handle Automatic Appointment Creation Tag
        if (result.success && result.response.includes('[CREATE_APPOINTMENT:')) {
            try {
                const match = result.response.match(/\[CREATE_APPOINTMENT:(.*?)\]/);
                if (match && match[1]) {
                    const data = JSON.parse(match[1]);

                    // Match staff name to staff id
                    const stylist = context.staff.find(s =>
                        s.full_name.toLowerCase().includes(data.staff_name?.toLowerCase()) ||
                        data.staff_name?.toLowerCase().includes(s.full_name.toLowerCase())
                    );

                    if (stylist) {
                        const salonId = 1; // Default for public chat or fetch from context
                        const serviceId = 1; // Default or AI provided

                        await query(
                            `INSERT INTO appointments (salon_id, service_id, staff_id, customer_name, customer_phone, appointment_date, appointment_time, status)
                             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                            [salonId, serviceId, stylist.id, data.customer_name, data.phone, data.date, data.time]
                        );

                        console.log('✅ AI Created Appointment automatically!');
                        // Clean the tag from the final response
                        result.response = result.response.replace(/\[CREATE_APPOINTMENT:.*?\]/g, '').trim();
                    }
                }
            } catch (err) {
                console.error('❌ AI Auto-Appointment Failed:', err.message);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Public AI chat error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * AI Vision - Analyze user photo for beauty advice
 */
router.post('/vision/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Görüntü dosyası gereklidir.' });
        }

        const result = await aiService.visionAnalysis(
            req.file.buffer,
            req.file.mimetype
        );

        res.json(result);
    } catch (error) {
        console.error('Vision analysis error:', error);
        res.status(500).json({ error: 'Analiz sırasında bir hata oluştu.' });
    }
});

/**
 * Salon Owner AI Chat
 * For authenticated salon owners
 */
router.post('/patron/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history, sessionId } = req.body;
        const salonId = req.user.salon_id;
        const userRole = req.user.role;
        const userName = req.user.full_name || 'Kullanıcı';

        if (!message) {
            return res.status(400).json({ error: 'Mesaj gerekli' });
        }

        const lowerMsg = message.toLowerCase().trim();
        const isGreeting = ['merhaba', 'selam', 'hey', 'günaydın', 'iyi akşamlar'].some(g => lowerMsg === g || lowerMsg.startsWith(g + ' '));

        console.log(`--- AI PATRON CHAT [${sessionId || 'no-session'}] ---`);

        let context = { userName, salonId };

        if (!isGreeting) {
            // Fetch selective data only for complex queries
            console.log('Fetching full context for complex query...');
            const [stocks, recentAppointments, staff, financialSummary] = await Promise.all([
                query('SELECT item_name, quantity, unit FROM stock WHERE salon_id = ? LIMIT 15', [salonId]),
                query(
                    `SELECT a.customer_name, a.appointment_date, a.appointment_time, a.status, s.name as service_name
                     FROM appointments a
                     JOIN services s ON a.service_id = s.id
                     WHERE a.salon_id = ?
                     ORDER BY a.created_at DESC LIMIT 10`,
                    [salonId]
                ),
                query("SELECT full_name, commission_rate FROM users WHERE salon_id = ? AND role = 'STAFF'", [salonId]),
                getFinancialSummary(salonId)
            ]);

            context = { ...context, stocks, recentAppointments, staff, financialSummary };
        }

        const result = await aiService.patronChat(message, history || [], context);
        res.json(result);
    } catch (error) {
        console.error('❌ Patron AI Chat Route Error:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

/**
 * Staff AI Chat
 * Work-focused AI assistant for staff members
 */
router.post('/staff/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user.id;
        const salonId = req.user.salon_id;

        if (!message) {
            return res.status(400).json({ error: 'Mesaj gerekli' });
        }

        // Get staff info
        const staff = await queryOne('SELECT full_name FROM users WHERE id = ?', [userId]);
        const salon = await queryOne('SELECT name FROM salons WHERE id = ?', [salonId]);

        // Get today's appointments for this staff
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = await query(
            `SELECT a.appointment_time as time, a.customer_name, s.name as service_name, u.full_name as staff_name
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             LEFT JOIN users u ON a.staff_id = u.id
             WHERE a.staff_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'
             ORDER BY a.appointment_time`,
            [userId, today]
        );

        // Get REAL stock info from database
        const stockInfo = await query(
            'SELECT item_name, quantity, unit, item_type FROM stock WHERE salon_id = ? AND quantity < 20 ORDER BY quantity ASC LIMIT 20',
            [salonId]
        );

        // Get Staff Daily Stats
        const dailyStats = {
            completedCount: todayAppointments.filter(a => a.status === 'completed').length,
            pendingCount: todayAppointments.filter(a => a.status === 'pending').length,
            totalAppointments: todayAppointments.length
        };

        const context = {
            staffName: staff?.full_name || 'Bilinmiyor',
            salonName: salon?.name || 'Bilinmiyor',
            todayAppointments,
            stockInfo,
            dailyStats
        };

        const result = await aiService.staffAssistant(message, history || [], context);

        res.json(result);

    } catch (error) {
        console.error('Staff AI chat error:', error);
        res.status(500).json({
            success: false,
            response: 'Bir hata oluştu. Lütfen tekrar dene.'
        });
    }
});

/**
 * Staff Quick Info
 * Quick action buttons for staff
 */
router.post('/staff/quick-info', authenticateToken, async (req, res) => {
    try {
        const { action } = req.body;
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        let response = '';

        switch (action) {
            case 'today-appointments':
                const appointments = await query(
                    `SELECT a.appointment_time, a.customer_name, s.name as service_name
                     FROM appointments a
                     LEFT JOIN services s ON a.service_id = s.id
                     WHERE a.staff_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'
                     ORDER BY a.appointment_time`,
                    [userId, today]
                );

                if (appointments.length === 0) {
                    response = '📅 Bugün randevunuz yok. Keyifli bir gün! ☕';
                } else {
                    response = `📅 Bugünkü Randevularınız (${appointments.length} adet):\n\n` +
                        appointments.map(apt =>
                            `🕐 ${apt.appointment_time} - ${apt.customer_name}\n   ${apt.service_name}`
                        ).join('\n\n');
                }
                break;

            case 'customer-history':
                response = '👤 Müşteri geçmişini sorgulamak için müşteri adını yazın veya "Aura\'ya Sor" butonunu kullanın.';
                break;

            case 'product-query':
                response = '🎨 Hangi müşteri için ürün sorgulamak istiyorsunuz? "Aura\'ya Sor" butonunu kullanarak detaylı sorgulama yapabilirsiniz.';
                break;

            default:
                response = 'Bilinmeyen işlem.';
        }

        res.json({ success: true, response });

    } catch (error) {
        console.error('Staff quick info error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * Helper: Get Financial Summary
 */
async function getFinancialSummary(salonId) {
    try {
        const income = await queryOne("SELECT SUM(amount) as total FROM transactions WHERE salon_id = ? AND transaction_type = 'income'", [salonId]);
        const expense = await queryOne("SELECT SUM(amount) as total FROM transactions WHERE salon_id = ? AND transaction_type = 'expense'", [salonId]);
        return {
            revenue: income?.total || 0,
            costs: expense?.total || 0,
            profit: (income?.total || 0) - (expense?.total || 0)
        };
    } catch (e) {
        console.error('Financial summary error:', e);
        return { revenue: 0, costs: 0, profit: 0 };
    }
}

module.exports = router;
