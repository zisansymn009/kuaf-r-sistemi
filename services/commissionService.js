const { query, queryOne, run } = require('../database/db');

// Prim hesaplama: Net Kar = Hizmet Bedeli - Malzeme Maliyeti - Personel Primi
async function calculateCommission(appointment, staffId) {
    try {
        const { id, price, shampoo_usage, dye_usage, salon_id } = appointment;

        // Malzeme maliyetini hesapla
        let materialCost = 0;

        // Şampuan maliyeti
        if (shampoo_usage > 0) {
            const shampoo = await queryOne(
                `SELECT unit_cost FROM stock 
                 WHERE salon_id = ? AND item_type = 'shampoo' 
                 ORDER BY last_updated DESC LIMIT 1`,
                [salon_id]
            );
            if (shampoo) {
                materialCost += (shampoo_usage / 1000) * shampoo.unit_cost; // gr to kg
            }
        }

        // Boya maliyeti
        if (dye_usage > 0) {
            const dye = await queryOne(
                `SELECT unit_cost FROM stock 
                 WHERE salon_id = ? AND item_type = 'dye' 
                 ORDER BY last_updated DESC LIMIT 1`,
                [salon_id]
            );
            if (dye) {
                materialCost += (dye_usage / 100) * dye.unit_cost; // cl to liter
            }
        }

        // 1. Prim oranını belirle (Hizmet Bazlı > Personel Varsayılan > Genel Varsayılan)
        const customComm = await queryOne(
            'SELECT commission_rate FROM staff_service_commissions WHERE staff_id = ? AND service_id = ?',
            [staffId, appointment.service_id]
        );

        let commissionRate = 0.15; // Genel varsayılan

        if (customComm && customComm.commission_rate > 0) {
            commissionRate = customComm.commission_rate;
        } else {
            const staff = await queryOne('SELECT commission_rate FROM users WHERE id = ?', [staffId]);
            if (staff && staff.commission_rate > 0) {
                commissionRate = staff.commission_rate;
            }
        }

        // Net kar hesapla
        const netProfit = price - materialCost;
        const commissionAmount = netProfit * commissionRate;

        // Prim kaydı oluştur
        await run(
            `INSERT INTO commissions (staff_id, appointment_id, service_id, service_price, material_cost, 
                                     commission_amount, commission_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [staffId, id, appointment.service_id, price, materialCost, commissionAmount, commissionRate]
        );

        // Finansal işlem kaydı
        await run(
            `INSERT INTO transactions (salon_id, appointment_id, transaction_type, amount, description)
             VALUES (?, ?, 'income', ?, 'Hizmet geliri')`,
            [salon_id, id, price]
        );

        console.log(`✅ Prim hesaplandı - Personel #${staffId}, Tutar: ${commissionAmount.toFixed(2)} TL`);

        return {
            servicePrice: price,
            materialCost,
            netProfit,
            commissionAmount
        };

    } catch (error) {
        console.error('Prim hesaplama hatası:', error);
        throw error;
    }
}

// Personel aylık prim raporu
async function getMonthlyCommissionReport(staffId, month) {
    try {
        const commissions = await query(
            `SELECT 
                c.*,
                a.appointment_date,
                a.customer_name,
                s.name as service_name
             FROM commissions c
             JOIN appointments a ON c.appointment_id = a.id
             JOIN services s ON a.service_id = s.id
             WHERE c.staff_id = ? AND TO_CHAR(a.completed_at, 'YYYY-MM') = ?
             ORDER BY a.completed_at DESC`,
            [staffId, month]
        );

        const totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
        const totalRevenue = commissions.reduce((sum, c) => sum + c.service_price, 0);
        const totalMaterialCost = commissions.reduce((sum, c) => sum + c.material_cost, 0);

        return {
            commissions,
            summary: {
                totalCommission,
                totalRevenue,
                totalMaterialCost,
                appointmentCount: commissions.length
            }
        };

    } catch (error) {
        console.error('Prim raporu hatası:', error);
        throw error;
    }
}

module.exports = {
    calculateCommission,
    getMonthlyCommissionReport
};
