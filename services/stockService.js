const { query, queryOne, run } = require('../database/db');

// Randevu tamamlandığında otomatik stok düşümü
async function processAppointmentCompletion(appointment) {
    try {
        const { salon_id, shampoo_usage, dye_usage } = appointment;

        // Şampuan stok düşümü
        if (shampoo_usage > 0) {
            const shampooStock = await queryOne(
                `SELECT id, quantity FROM stock 
                 WHERE salon_id = ? AND item_type = 'shampoo' 
                 ORDER BY quantity DESC LIMIT 1`,
                [salon_id]
            );

            if (shampooStock && shampooStock.quantity >= shampoo_usage) {
                // Stok düş
                await run(
                    'UPDATE stock SET quantity = quantity - ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                    [shampoo_usage, shampooStock.id]
                );

                // Hareket kaydı
                await run(
                    `INSERT INTO stock_movements (stock_id, appointment_id, movement_type, quantity, notes)
                     VALUES (?, ?, 'out', ?, 'Otomatik düşüm - Randevu tamamlandı')`,
                    [shampooStock.id, appointment.id, shampoo_usage]
                );
            }
        }

        // Boya stok düşümü
        if (dye_usage > 0) {
            const dyeStock = await queryOne(
                `SELECT id, quantity FROM stock 
                 WHERE salon_id = ? AND item_type = 'dye' 
                 ORDER BY quantity DESC LIMIT 1`,
                [salon_id]
            );

            if (dyeStock && dyeStock.quantity >= dye_usage) {
                await run(
                    'UPDATE stock SET quantity = quantity - ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                    [dye_usage, dyeStock.id]
                );

                await run(
                    `INSERT INTO stock_movements (stock_id, appointment_id, movement_type, quantity, notes)
                     VALUES (?, ?, 'out', ?, 'Otomatik düşüm - Randevu tamamlandı')`,
                    [dyeStock.id, appointment.id, dye_usage]
                );
            }
        }

        console.log(`✅ Stok otomatik düşüldü - Randevu #${appointment.id}`);

    } catch (error) {
        console.error('Stok düşüm hatası:', error);
        throw error;
    }
}

// Stok seviyesi uyarısı
async function checkStockLevels(salonId) {
    try {
        const lowStock = await query(
            `SELECT * FROM stock 
             WHERE salon_id = ? AND quantity < 100
             ORDER BY quantity ASC`,
            [salonId]
        );

        return lowStock;
    } catch (error) {
        console.error('Stok kontrol hatası:', error);
        return [];
    }
}

module.exports = {
    processAppointmentCompletion,
    checkStockLevels
};
