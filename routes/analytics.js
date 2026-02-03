const express = require('express');
const { query, queryOne } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * GET /api/patron/analytics
 * Global dashboard summary (Revenue from transactions, stats from appointments)
 */
router.get('/', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        if (!salonId) return res.status(400).json({ error: 'Salon ID gerekli' });

        // Date - Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        const dateStr = thirtyDaysAgo.toISOString();

        // 1. Finance Stats (From Transactions - SAME logic as /finance/stats)
        const revenueResult = await queryOne(
            `SELECT SUM(amount) as total FROM transactions 
             WHERE salon_id = ? AND transaction_type = 'income' AND created_at >= ?`,
            [salonId, dateStr]
        );

        const expenseResult = await queryOne(
            `SELECT SUM(amount) as total FROM transactions 
             WHERE salon_id = ? AND transaction_type = 'expense' AND created_at >= ?`,
            [salonId, dateStr]
        );

        console.log('DEBUG ANALYTICS:', {
            dateStr,
            revTotal: revenueResult?.total,
            expTotal: expenseResult?.total,
            calcNet: (revenueResult?.total || 0) - (expenseResult?.total || 0)
        });

        // 2. Trend Verisi (Chart için) - Son 7 gün
        const revenueData = [];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dStr = date.toLocaleDateString('sv-SE');

            const dayRevenue = await queryOne(
                `SELECT SUM(amount) as total FROM transactions 
                 WHERE salon_id = ? AND transaction_type = 'income' 
                 AND CAST(created_at AS DATE) = ?`,
                [salonId, dStr]
            );

            labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
            revenueData.push(dayRevenue?.total || 0);
        }

        // 3. Appointment Stats
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const todayCount = await queryOne(
            'SELECT COUNT(*) as count FROM appointments WHERE salon_id = ? AND appointment_date = ?',
            [salonId, todayStr]
        );

        // Average duration
        const avgDuration = await queryOne(
            `SELECT AVG(s.duration) as avg
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.salon_id = ? AND a.status = 'completed' AND a.appointment_date >= ?`,
            [salonId, dateStr]
        );

        // Top service
        const topService = await queryOne(
            `SELECT s.name, COUNT(*) as count
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.salon_id = ? AND a.appointment_date >= ?
             GROUP BY s.id
             ORDER BY count DESC
             LIMIT 1`,
            [salonId, dateStr]
        );

        // Staff Performance
        const staffPerformance = await query(
            `SELECT 
                u.id, u.full_name, u.commission_rate,
                COUNT(a.id) as appointment_count,
                SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue,
                SUM(CASE WHEN a.status = 'completed' THEN s.price * u.commission_rate ELSE 0 END) as total_commission
             FROM users u
             LEFT JOIN appointments a ON u.id = a.staff_id
             LEFT JOIN services s ON a.service_id = s.id
             WHERE u.salon_id = ? AND u.role = 'STAFF'
             GROUP BY u.id
             ORDER BY revenue DESC`,
            [salonId]
        );

        res.json({
            success: true,
            stats: {
                totalAppointments: todayCount?.count || 0,
                totalRevenue: Number(revenueResult?.total || 0),
                totalExpense: Number(expenseResult?.total || 0),
                netProfit: Number(revenueResult?.total || 0) - Number(expenseResult?.total || 0)
            },
            revenueData: {
                labels,
                values: revenueData
            },
            avgDuration: Math.round(avgDuration?.avg || 0),
            topService: topService?.name || '-',
            staffPerformance: staffPerformance || []
        });
    } catch (error) {
        console.error('Core analytics error:', error);
        res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
});

/**
 * GET /api/patron/analytics/summary
 * Overall statistics for the dashboard
 */
router.get('/summary', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        if (!salonId) {
            return res.status(400).json({ error: 'Salon ID gerekli' });
        }

        // Get current month stats
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const stats = await queryOne(`
            SELECT 
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appointments
            FROM appointments
            WHERE salon_id = ? AND TO_CHAR(appointment_date, 'YYYY-MM') = ?
        `, [salonId, currentMonth]);

        // Get revenue (from completed appointments)
        const revenue = await queryOne(`
            SELECT SUM(s.price) as total_revenue
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.salon_id = ? 
            AND a.status = 'completed'
            AND TO_CHAR(a.appointment_date, 'YYYY-MM') = ?
        `, [salonId, currentMonth]);

        res.json({
            success: true,
            data: {
                totalAppointments: stats.total_appointments || 0,
                completedAppointments: stats.completed_appointments || 0,
                cancelledAppointments: stats.cancelled_appointments || 0,
                completionRate: stats.total_appointments > 0
                    ? ((stats.completed_appointments / stats.total_appointments) * 100).toFixed(1)
                    : 0,
                totalRevenue: revenue.total_revenue || 0,
                period: 'current_month'
            }
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * GET /api/patron/analytics/top-customers
 * Returns top customers by visit count and total spent
 */
router.get('/top-customers', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const days = parseInt(req.query.days) || 30;
        const limit = parseInt(req.query.limit) || 10;

        if (!salonId) {
            return res.status(400).json({ error: 'Salon ID gerekli' });
        }

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const dateStr = dateThreshold.toISOString().split('T')[0];

        const topCustomers = await query(`
            SELECT 
                a.customer_name,
                a.customer_phone,
                COUNT(*) as visit_count,
                SUM(s.price) as total_spent,
                MAX(a.appointment_date) as last_visit,
                STRING_AGG(DISTINCT s.name, ',') as services_used
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.salon_id = ? 
            AND a.status = 'completed'
            AND a.appointment_date >= ?
            GROUP BY a.customer_phone
            ORDER BY visit_count DESC, total_spent DESC
            LIMIT ?
        `, [salonId, dateStr, limit]);

        res.json({
            success: true,
            data: topCustomers,
            period: `${days} gün`
        });
    } catch (error) {
        console.error('Top customers error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * GET /api/patron/analytics/popular-services
 * Returns most booked services with statistics
 */
router.get('/popular-services', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const days = parseInt(req.query.days) || 30;

        if (!salonId) {
            return res.status(400).json({ error: 'Salon ID gerekli' });
        }

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const dateStr = dateThreshold.toISOString().split('T')[0];

        const popularServices = await query(`
            SELECT 
                s.id,
                s.name,
                s.category,
                s.price,
                COUNT(*) as booking_count,
                SUM(s.price) as total_revenue,
                AVG(s.price) as avg_price
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.salon_id = ? 
            AND a.status = 'completed'
            AND a.appointment_date >= ?
            GROUP BY s.id
            ORDER BY booking_count DESC
        `, [salonId, dateStr]);

        // Calculate percentages
        const totalBookings = popularServices.reduce((sum, s) => sum + s.booking_count, 0);
        const servicesWithPercentage = popularServices.map(service => ({
            ...service,
            percentage: totalBookings > 0
                ? ((service.booking_count / totalBookings) * 100).toFixed(1)
                : 0
        }));

        res.json({
            success: true,
            data: servicesWithPercentage,
            period: `${days} gün`,
            totalBookings
        });
    } catch (error) {
        console.error('Popular services error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * GET /api/patron/analytics/appointments
 * Returns appointment history with filters
 */
router.get('/appointments', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { status, startDate, endDate, staffId, page = 1, limit = 20 } = req.query;

        if (!salonId) {
            return res.status(400).json({ error: 'Salon ID gerekli' });
        }

        let whereConditions = ['a.salon_id = ?'];
        let params = [salonId];

        if (status) {
            whereConditions.push('a.status = ?');
            params.push(status);
        }

        if (startDate) {
            whereConditions.push('a.appointment_date >= ?');
            params.push(startDate);
        }

        if (endDate) {
            whereConditions.push('a.appointment_date <= ?');
            params.push(endDate);
        }

        if (staffId) {
            whereConditions.push('a.staff_id = ?');
            params.push(staffId);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const appointments = await query(`
            SELECT 
                a.id,
                a.customer_name,
                a.customer_phone,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.notes,
                s.name as service_name,
                s.price as service_price,
                s.duration as service_duration,
                u.full_name as staff_name
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            JOIN users u ON a.staff_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Get total count for pagination
        const countResult = await queryOne(`
            SELECT COUNT(*) as total
            FROM appointments a
            WHERE ${whereConditions.join(' AND ')}
        `, params);

        res.json({
            success: true,
            data: appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Appointments history error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

/**
 * GET /api/patron/analytics/trends
 * Returns monthly trends for appointments and revenue
 */
router.get('/trends', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const months = parseInt(req.query.months) || 6;

        if (!salonId) {
            return res.status(400).json({ error: 'Salon ID gerekli' });
        }

        const trends = await query(`
            SELECT 
                TO_CHAR(a.appointment_date, 'YYYY-MM') as month,
                COUNT(*) as appointment_count,
                SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN a.status = 'completed' THEN s.price ELSE 0 END) as revenue
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.salon_id = ?
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '1 month' * ?
            GROUP BY month
            ORDER BY month ASC
        `, [salonId, months]);

        res.json({
            success: true,
            data: trends,
            period: `${months} ay`
        });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
