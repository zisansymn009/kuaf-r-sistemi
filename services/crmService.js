const { query, queryOne, run } = require('../database/db');

// Müşteri karnesi - geçmiş randevular ve boya reçeteleri
async function getCustomerRecord(customerPhone, salonId) {
    try {
        const record = await queryOne(
            `SELECT * FROM customer_records 
             WHERE customer_phone = ? AND salon_id = ?`,
            [customerPhone, salonId]
        );

        if (!record) {
            return null;
        }

        // Geçmiş randevular
        const appointments = await query(
            `SELECT 
                a.*,
                s.name as service_name,
                s.price,
                u.full_name as staff_name,
                df.formula_details,
                df.notes as formula_notes
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             JOIN users u ON a.staff_id = u.id
             LEFT JOIN dye_formulas df ON a.id = df.appointment_id
             WHERE a.customer_phone = ? AND a.salon_id = ? AND a.status = 'completed'
             ORDER BY a.completed_at DESC`,
            [customerPhone, salonId]
        );

        return {
            ...record,
            appointments
        };

    } catch (error) {
        console.error('Müşteri karnesi hatası:', error);
        throw error;
    }
}

// Sabit müşteri ata
async function assignRegularCustomer(customerPhone, staffId, salonId) {
    try {
        const record = await queryOne(
            'SELECT id FROM customer_records WHERE customer_phone = ? AND salon_id = ?',
            [customerPhone, salonId]
        );

        if (record) {
            await run(
                'UPDATE customer_records SET staff_id = ?, is_regular = 1 WHERE id = ?',
                [staffId, record.id]
            );
        }

        console.log(`✅ Sabit müşteri atandı - ${customerPhone} -> Personel #${staffId}`);

    } catch (error) {
        console.error('Sabit müşteri atama hatası:', error);
        throw error;
    }
}

// Personel analizi - ciro ve malzeme sarf
async function getStaffAnalysis(salonId, startDate, endDate) {
    try {
        const analysis = await query(
            `SELECT 
                u.id,
                u.full_name,
                COUNT(a.id) as total_appointments,
                SUM(s.price) as total_revenue,
                SUM(c.material_cost) as total_material_cost,
                SUM(c.commission_amount) as total_commission,
                SUM(s.shampoo_usage) as total_shampoo_used,
                SUM(s.dye_usage) as total_dye_used
             FROM users u
             LEFT JOIN appointments a ON u.id = a.staff_id 
                AND a.status = 'completed'
                AND a.completed_at BETWEEN ? AND ?
             LEFT JOIN services s ON a.service_id = s.id
             LEFT JOIN commissions c ON a.id = c.appointment_id
             WHERE u.salon_id = ? AND u.role = 'STAFF'
             GROUP BY u.id
             ORDER BY total_revenue DESC`,
            [startDate, endDate, salonId]
        );

        return analysis;

    } catch (error) {
        console.error('Personel analizi hatası:', error);
        throw error;
    }
}

module.exports = {
    getCustomerRecord,
    assignRegularCustomer,
    getStaffAnalysis
};
