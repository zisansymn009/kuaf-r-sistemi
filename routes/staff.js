const express = require('express');
const { query, queryOne, run } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Personel authentication
router.use(authenticateToken);
router.use(requireRole('STAFF'));

// Staff Dashboard Data
// Staff Dashboard Data
router.get('/dashboard', async (req, res) => {
    try {
        const staffId = req.user.id;
        const salonId = req.user.salon_id;
        // Fix Timezone issue: use Turkey time for 'today'
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

        console.log(`[DEBUG] Staff Dashboard Request - UserID: ${staffId}, SalonID: ${salonId}, Today: ${today}`);

        // Get staff info including commission rate
        const staff = await queryOne('SELECT full_name, commission_rate FROM users WHERE id = ?', [staffId]);
        const salon = await queryOne('SELECT name FROM salons WHERE id = ?', [salonId]);

        // Today's Appointments with Service Details
        const appointments = await query(
            `SELECT a.*, s.name as service_name, s.price, s.duration 
             FROM appointments a 
             LEFT JOIN services s ON a.service_id = s.id 
             WHERE a.staff_id = ? AND a.appointment_date = ? 
             ORDER BY a.appointment_time ASC`,
            [staffId, today]
        );
        console.log(`[DEBUG] Found ${appointments.length} appointments for staff ${staffId} on ${today}`);

        // Calculate Daily Earnings (Commission based on completed appts)
        const completedAppts = appointments.filter(a => a.status === 'completed');
        const totalRevenue = completedAppts.reduce((sum, appt) => sum + (appt.price || 0), 0);
        const commissionRate = staff?.commission_rate || 0.15; // Default 15%
        const dailyEarnings = totalRevenue * commissionRate;

        // Get Working Hours (Schedule)
        const workHours = await query(
            'SELECT day_of_week, start_time, end_time, is_off FROM staff_working_hours WHERE staff_id = ? ORDER BY day_of_week',
            [staffId]
        );
        console.log(`[DEBUG] Found ${workHours.length} schedule rows for staff ${staffId}`);

        res.json({
            success: true,
            staff: staff?.full_name || 'Personel',
            salon: salon?.name || 'Salon',
            today: appointments,
            schedule: workHours,
            stats: {
                todayAppointments: appointments.length,
                completedToday: completedAppts.length,
                pendingToday: appointments.filter(a => a.status === 'pending').length,
                estimatedEarnings: dailyEarnings,
                commissionRate: commissionRate
            }
        });
    } catch (error) {
        console.error('Staff dashboard error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Kendi randevularını listele
router.get('/appointments', async (req, res) => {
    try {
        const staffId = req.user.id;
        const { status, date } = req.query;

        let sql = `
            SELECT 
                a.*,
                s.name as service_name,
                s.price as service_price,
                s.duration
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.staff_id = ?
        `;
        const params = [staffId];

        if (status) {
            sql += ' AND a.status = ?';
            params.push(status);
        }

        if (date) {
            sql += ' AND a.appointment_date = ?';
            params.push(date);
        }

        sql += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

        const appointments = await query(sql, params);

        res.json({ success: true, appointments });
    } catch (error) {
        console.error('Randevu listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Randevu tamamla
router.post('/appointments/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.id;
        const { notes } = req.body;

        // Randevu kontrolü
        const appointment = await queryOne(
            `SELECT a.*, s.price
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             WHERE a.id = ? AND a.staff_id = ?`,
            [id, staffId]
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Randevu bulunamadı' });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'Randevu zaten tamamlanmış' });
        }

        // Randevuyu tamamla
        await run(
            `UPDATE appointments 
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP, notes = ?
             WHERE id = ?`,
            [notes, id]
        );

        res.json({ success: true, message: 'Randevu tamamlandı' });

    } catch (error) {
        console.error('Randevu tamamlama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Randevu iptal/gelmedi
router.post('/appointments/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.user.id;
        const { reason } = req.body;

        const status = reason === 'no_show' ? 'no_show' : 'cancelled';

        await run(
            'UPDATE appointments SET status = ?, notes = ? WHERE id = ? AND staff_id = ?',
            [status, reason, id, staffId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Randevu iptal hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
