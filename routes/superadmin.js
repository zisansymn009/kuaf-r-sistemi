const express = require('express');
const { query, queryOne, run } = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Tüm middleware'lerde SUPER_ADMIN kontrolü
router.use(authenticateToken);
router.use(requireRole('SUPER_ADMIN'));

// Bekleyen salonları listele
router.get('/salons/pending', async (req, res) => {
    try {
        const salons = await query(
            `SELECT s.*, u.username as patron_username, u.email as patron_email
             FROM salons s
             LEFT JOIN users u ON s.id = u.salon_id AND u.role = 'PATRON'
             WHERE s.is_approved = 0
             ORDER BY s.created_at DESC`
        );

        res.json({ success: true, salons });
    } catch (error) {
        console.error('Salon listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tüm salonları listele
router.get('/salons', async (req, res) => {
    try {
        const salons = await query(
            `SELECT s.*, u.username as patron_username, u.full_name as patron_name
             FROM salons s
             LEFT JOIN users u ON s.id = u.salon_id AND u.role = 'PATRON'
             ORDER BY s.created_at DESC`
        );

        res.json({ success: true, salons });
    } catch (error) {
        console.error('Salon listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon onayla
router.post('/salons/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await run(
            `UPDATE salons 
             SET is_approved = 1, approved_at = CURRENT_TIMESTAMP, subscription_status = 'active'
             WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: 'Salon onaylandı' });
    } catch (error) {
        console.error('Salon onaylama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon dondur/aktifleştir
router.post('/salons/:id/toggle-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await run(
            'UPDATE salons SET is_active = ?, subscription_status = ? WHERE id = ?',
            [is_active ? 1 : 0, is_active ? 'active' : 'suspended', id]
        );

        res.json({
            success: true,
            message: is_active ? 'Salon aktifleştirildi' : 'Salon donduruldu'
        });
    } catch (error) {
        console.error('Salon durum değiştirme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Sistem geneli istatistikler
router.get('/analytics', async (req, res) => {
    try {
        // Toplam salon sayısı
        const totalSalons = await queryOne(
            'SELECT COUNT(*) as count FROM salons WHERE is_approved = 1'
        );

        // Aktif salonlar
        const activeSalons = await queryOne(
            'SELECT COUNT(*) as count FROM salons WHERE is_approved = 1 AND is_active = 1'
        );

        // Toplam randevu sayısı
        const totalAppointments = await queryOne(
            'SELECT COUNT(*) as count FROM appointments WHERE status = "completed"'
        );

        // Toplam ciro
        const totalRevenue = await queryOne(
            `SELECT SUM(s.price) as total
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.status = 'completed'`
        );

        // Aylık ciro (son 12 ay)
        const monthlyRevenue = await query(
            `SELECT 
                TO_CHAR(a.completed_at, 'YYYY-MM') as month,
                SUM(s.price) as revenue,
                COUNT(a.id) as appointment_count
              FROM appointments a
              JOIN services s ON a.service_id = s.id
              WHERE a.status = 'completed' 
                 AND a.completed_at >= CURRENT_DATE - INTERVAL '12 months'
              GROUP BY TO_CHAR(a.completed_at, 'YYYY-MM')
              ORDER BY month DESC`
        );

        // Salon bazlı performans
        const salonPerformance = await query(
            `SELECT 
                sa.id,
                sa.name,
                COUNT(a.id) as total_appointments,
                SUM(s.price) as total_revenue
             FROM salons sa
             LEFT JOIN appointments a ON sa.id = a.salon_id AND a.status = 'completed'
             LEFT JOIN services s ON a.service_id = s.id
             WHERE sa.is_approved = 1
             GROUP BY sa.id, sa.name
             ORDER BY total_revenue DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            stats: {
                totalSalons: totalSalons.count,
                activeSalons: activeSalons.count,
                totalAppointments: totalAppointments.count,
                totalRevenue: totalRevenue.total || 0
            },
            monthlyRevenue,
            topSalons: salonPerformance
        });

    } catch (error) {
        console.error('Analytics hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
