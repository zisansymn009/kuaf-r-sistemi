const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { query, queryOne, run } = require('../database/db');
const { authenticateToken, requireSalonOwner } = require('../middleware/auth');

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = file.fieldname === 'showcase_image' ? 'public/uploads/showcase/' : 'public/uploads/services/';
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const prefix = file.fieldname === 'showcase_image' ? 'showcase-' : 'service-';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP)'));
        }
    }
});

// Tüm route'larda authentication ve patron kontrolü
router.use(authenticateToken);
router.use(requireSalonOwner);



// Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        // PostgreSQL uyumlu istatistikler
        const stats = await queryOne(`
            SELECT 
                (SELECT COUNT(*) FROM appointments WHERE salon_id = $1 AND appointment_date = CURRENT_DATE) as today_appointments,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE salon_id = $1 AND transaction_type = 'income' AND CAST(created_at AS DATE) = CURRENT_DATE) as today_revenue,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE salon_id = $1 AND transaction_type = 'income' AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) as monthly_revenue,
                (SELECT COUNT(*) FROM users WHERE salon_id = $1 AND role = 'STAFF' AND is_active = 1) as total_staff
        `, [salonId]);

        res.json({
            success: true,
            todayAppointments: stats.today_appointments || 0,
            todayRevenue: stats.today_revenue || 0,
            monthlyRevenue: stats.monthly_revenue || 0,
            totalStaff: stats.total_staff || 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
});

// Randevu listesi
router.get('/appointments', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { status, staff_id, date_from, date_to, date } = req.query;

        let whereConditions = ['a.salon_id = ?'];
        let params = [salonId];

        if (status) {
            whereConditions.push('a.status = ?');
            params.push(status);
        }
        if (staff_id) {
            whereConditions.push('a.staff_id = ?');
            params.push(staff_id);
        }
        if (date) {
            whereConditions.push('a.appointment_date = ?');
            params.push(date);
        }
        if (date_from) {
            whereConditions.push('a.appointment_date >= ?');
            params.push(date_from);
        }
        if (date_to) {
            whereConditions.push('a.appointment_date <= ?');
            params.push(date_to);
        }

        const appointments = await query(
            `SELECT a.*, 
                    s.name as service_name, s.price as service_price, s.duration,
                    u.full_name as staff_name
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             LEFT JOIN users u ON a.staff_id = u.id
             WHERE ${whereConditions.join(' AND ')}
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            params
        );

        res.json({ success: true, appointments });
    } catch (error) {
        console.error('Randevu listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Manuel Randevu Oluştur (Patron tarafından)
router.post('/appointments/manual', async (req, res) => {
    try {
        const { customer_name, customer_phone, appointment_date, appointment_time, service_id, staff_id } = req.body;
        const salonId = req.user.salon_id;

        if (!customer_name || !customer_phone || !appointment_date || !appointment_time || !service_id || !staff_id) {
            return res.status(400).json({ error: 'Tüm alanlar gereklidir' });
        }

        // Randevu ekle
        const result = await run(
            `INSERT INTO appointments (
                salon_id, customer_name, customer_phone, 
                appointment_date, appointment_time, 
                service_id, staff_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [salonId, customer_name, customer_phone, appointment_date, appointment_time, service_id, staff_id]
        );

        res.json({ success: true, message: 'Randevu oluşturuldu', appointmentId: result.lastID });
    } catch (error) {
        console.error('Manuel randevu oluşturma hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});


// Randevu güncelleme (durum değiştirme)
router.patch('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const salonId = req.user.salon_id;

        await run(
            'UPDATE appointments SET status = ? WHERE id = ? AND salon_id = ?',
            [status, id, salonId]
        );

        res.json({ success: true, message: 'Randevu güncellendi' });
    } catch (error) {
        console.error('Randevu güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Randevuya personel ata (Patron Tarafından)
router.patch('/appointments/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { staff_id } = req.body;
        const salonId = req.user.salon_id;

        if (!staff_id) {
            return res.status(400).json({ error: 'Personel seçilmelidir' });
        }

        // Personelin o salona ait olduğunu doğrula
        const staff = await queryOne("SELECT id FROM users WHERE id = ? AND salon_id = ? AND role = 'STAFF'", [staff_id, salonId]);
        if (!staff) {
            return res.status(400).json({ error: 'Geçersiz personel' });
        }

        await run(
            'UPDATE appointments SET staff_id = ? WHERE id = ? AND salon_id = ?',
            [staff_id, id, salonId]
        );

        res.json({ success: true, message: 'Personel atandı' });
    } catch (error) {
        console.error('Atama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Randevu Sil
router.delete('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;
        await run('DELETE FROM appointments WHERE id = ? AND salon_id = ?', [id, salonId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Randevu silinemedi' });
    }
});

// Personel listesi
router.get('/staff', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const staff = await query(
            `SELECT id, username, full_name, email, phone, commission_rate, is_active, created_at
             FROM users
             WHERE salon_id = ? AND role = 'STAFF'
             ORDER BY full_name`,
            [salonId]
        );

        res.json({ success: true, staff });
    } catch (error) {
        console.error('Personel listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel ekle
router.post('/staff', async (req, res) => {
    try {
        const { username, password, full_name, email, phone } = req.body;
        const salonId = req.user.salon_id;

        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Zorunlu alanları doldurun' });
        }

        // Kullanıcı adı kontrolü
        const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı kullanılıyor' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await run(
            `INSERT INTO users (username, password, role, full_name, email, phone, salon_id, is_active)
             VALUES (?, ?, 'STAFF', ?, ?, ?, ?, 1)`,
            [username, hashedPassword, full_name, email, phone, salonId]
        );

        res.json({ success: true, message: 'Personel eklendi' });
    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel sil
router.delete('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        await run("DELETE FROM users WHERE id = ? AND salon_id = ? AND role = 'STAFF'", [id, salonId]);
        res.json({ success: true, message: 'Personel silindi' });
    } catch (error) {
        res.status(500).json({ error: 'Personel silinemedi' });
    }
});

// Personel aktif/pasif
router.patch('/staff/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const salonId = req.user.salon_id;

        await run(
            "UPDATE users SET is_active = ? WHERE id = ? AND salon_id = ? AND role = 'STAFF'",
            [is_active ? 1 : 0, id, salonId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Personel durum hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel bilgilerini güncelle (pirim oranı dahil)
router.patch('/staff/:id', async (req, res) => {
    console.log('🔧 PATCH /staff/:id called - ID:', req.params.id, 'Body:', req.body);
    try {
        const { id } = req.params;
        const { commission_rate, full_name, email, phone } = req.body;
        const salonId = req.user.salon_id;

        // Verify staff belongs to salon
        const staff = await queryOne("SELECT id FROM users WHERE id = ? AND salon_id = ? AND role = 'STAFF'", [id, salonId]);
        if (!staff) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        // Build update query dynamically based on provided fields
        const updates = [];
        const params = [];

        if (commission_rate !== undefined) {
            updates.push('commission_rate = ?');
            params.push(commission_rate);
        }
        if (full_name !== undefined) {
            updates.push('full_name = ?');
            params.push(full_name);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi' });
        }

        params.push(id, salonId);
        await run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND salon_id = ?`,
            params
        );

        res.json({ success: true, message: 'Personel bilgileri güncellendi' });
    } catch (error) {
        console.error('Personel güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel detaylı bilgi (Pirimler, saatler vs)
router.get('/staff/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        const staff = await queryOne(
            "SELECT id, username, full_name, email, phone, commission_rate, is_active FROM users WHERE id = ? AND salon_id = ? AND role = 'STAFF'",
            [id, salonId]
        );

        if (!staff) {
            return res.status(404).json({ error: 'Personel bulunamadı' });
        }

        const commissions = await query(
            'SELECT s.id as service_id, s.name as service_name, s.price as service_price, s.category, COALESCE(ssc.commission_rate, 0) as custom_rate ' +
            'FROM services s ' +
            'LEFT JOIN staff_service_commissions ssc ON s.id = ssc.service_id AND ssc.staff_id = ? ' +
            'WHERE s.salon_id = ? AND s.is_active = 1',
            [id, salonId]
        );

        const hours = await query(
            'SELECT day_of_week, start_time, end_time, is_off FROM staff_working_hours WHERE staff_id = ?',
            [id]
        );

        const advances = await query(
            'SELECT id, amount, description, date FROM staff_advances WHERE staff_id = ? ORDER BY date DESC LIMIT 10',
            [id]
        );

        res.json({ success: true, staff, commissions, hours, advances });
    } catch (error) {
        console.error('Personel detay hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel özel pirim oranlarını güncelle (Toplu)
router.post('/staff/:id/commissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { commissions } = req.body; // Array of { service_id, rate }
        const salonId = req.user.salon_id;

        // Verify staff belongs to salon
        const staff = await queryOne('SELECT id FROM users WHERE id = ? AND salon_id = ?', [id, salonId]);
        if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });

        for (const comm of commissions) {
            await run(
                'INSERT INTO staff_service_commissions (staff_id, service_id, commission_rate) ' +
                'VALUES (?, ?, ?) ' +
                'ON CONFLICT(staff_id, service_id) DO UPDATE SET commission_rate = EXCLUDED.commission_rate',
                [id, comm.service_id, comm.rate]
            );
        }

        res.json({ success: true, message: 'Özel pirimler güncellendi' });
    } catch (error) {
        console.error('Pirim toplu güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel çalışma saatlerini güncelle
router.post('/staff/:id/hours', async (req, res) => {
    try {
        const { id } = req.params;
        const { hours } = req.body; // Array of { day, start, end, is_off }
        const salonId = req.user.salon_id;

        console.log(`[DEBUG] Updating hours for staff ${id}. Payload size: ${hours ? hours.length : 'null'}`);

        if (!hours || !Array.isArray(hours)) {
            return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }

        const staff = await queryOne('SELECT id FROM users WHERE id = ? AND salon_id = ?', [id, salonId]);
        if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });

        for (const h of hours) {
            await run(
                `INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, is_off) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(staff_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_off = EXCLUDED.is_off`,
                [id, h.day, h.start, h.end, h.is_off ? 1 : 0]
            );
        }

        console.log(`[DEBUG] Hours updated for staff ${id}`);
        res.json({ success: true, message: 'Çalışma saatleri güncellendi' });
    } catch (error) {
        console.error('Saat güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});


// Personel avans/ödeme ekle
router.post('/staff/:id/advances', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;
        const salonId = req.user.salon_id;

        const staff = await queryOne('SELECT id FROM users WHERE id = ? AND salon_id = ?', [id, salonId]);
        if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });

        await run(
            'INSERT INTO staff_advances (staff_id, amount, description) VALUES (?, ?, ?)',
            [id, amount, description]
        );

        // Finansa da gider olarak ekle
        await run(
            "INSERT INTO transactions (salon_id, transaction_type, amount, description) VALUES (?, 'expense', ?, ?)",
            [salonId, amount, `Personel Ödemesi/Avans: ${staff.full_name} - ${description}`]
        );

        res.json({ success: true, message: 'Ödeme kaydedildi' });
    } catch (error) {
        console.error('Avans ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Hizmet kataloğu
router.get('/catalog', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const services = await query(
            `SELECT s.*, 
                    (SELECT STRING_AGG(image_url, ',') FROM service_images WHERE service_id = s.id AND image_type = 'before') as before_images,
                    (SELECT STRING_AGG(image_url, ',') FROM service_images WHERE service_id = s.id AND image_type = 'after') as after_images
             FROM services s
             WHERE s.salon_id = ?
             ORDER BY s.category, s.name`,
            [salonId]
        );

        res.json({ success: true, services });
    } catch (error) {
        console.error('Katalog listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Hizmetler (Kısa isim)
router.get('/services', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const services = await query('SELECT * FROM services WHERE salon_id = ? AND is_active = 1', [salonId]);
        res.json({ success: true, services });
    } catch (error) {
        res.status(500).json({ error: 'Hizmetler alınamadı' });
    }
});

// Hizmet Ekle (Basit POST)
router.post('/services', async (req, res) => {
    try {
        const { name, price, duration, category } = req.body;
        const salonId = req.user.salon_id;

        const result = await run(
            'INSERT INTO services (salon_id, name, price, duration, category, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [salonId, name, price, duration, category]
        );
        res.json({ success: true, serviceId: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Hizmet eklenemedi' });
    }
});

// Hizmet Sil
router.delete('/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;
        await run('DELETE FROM services WHERE id = ? AND salon_id = ?', [id, salonId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Hizmet silinemedi' });
    }
});

// --- Hizmet Reçete Yönetimi ---

// Bir hizmetin reçetesini al
router.get('/services/:id/recipe', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        const recipe = await query(
            `SELECT sr.*, s.item_name, s.brand, s.unit, s.unit_cost
             FROM service_recipes sr
             JOIN stock s ON sr.stock_id = s.id
             WHERE sr.service_id = ? AND sr.salon_id = ?`,
            [id, salonId]
        );

        res.json({ success: true, recipe });
    } catch (error) {
        console.error('Reçete getirme hatası:', error);
        res.status(500).json({ error: 'Reçete alınamadı' });
    }
});

// Reçeteye ürün ekle veya güncelle
router.post('/services/:id/recipe', async (req, res) => {
    try {
        const { id } = req.params; // service_id
        const { stock_id, quantity } = req.body;
        const salonId = req.user.salon_id;

        // Önce var mı bak (Unique constraint olduğu için INSERT OR REPLACE de olabilir ama açıkça yapalım)
        const existing = await queryOne(
            'SELECT id FROM service_recipes WHERE service_id = ? AND stock_id = ?',
            [id, stock_id]
        );

        if (existing) {
            await run(
                'UPDATE service_recipes SET quantity = ? WHERE id = ?',
                [quantity, existing.id]
            );
        } else {
            await run(
                'INSERT INTO service_recipes (salon_id, service_id, stock_id, quantity) VALUES (?, ?, ?, ?)',
                [salonId, id, stock_id, quantity]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Reçete kaydetme hatası:', error);
        res.status(500).json({ error: 'Reçete kaydedilemedi' });
    }
});

// Reçeteden ürün çıkar
router.delete('/services/:id/recipe/:stockId', async (req, res) => {
    try {
        const { id, stockId } = req.params;
        const salonId = req.user.salon_id;

        await run(
            'DELETE FROM service_recipes WHERE service_id = ? AND stock_id = ? AND salon_id = ?',
            [id, stockId, salonId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Reçete silme hatası:', error);
        res.status(500).json({ error: 'Ürün reçeteden çıkarılamadı' });
    }
});

// Hizmet ekle (sadece text - fotoğrafsız)
router.post('/catalog-simple', async (req, res) => {
    try {
        console.log('=== CATALOG SIMPLE POST ===');
        console.log('req.body:', req.body);

        const { name, description, price, duration, category, shampoo_usage, dye_usage } = req.body;
        const salonId = req.user.salon_id;

        if (!name || !price || !duration) {
            console.log('❌ Validation failed:', { name, price, duration });
            return res.status(400).json({ error: 'İsim, fiyat ve süre zorunludur' });
        }

        console.log('✅ Creating service...');
        const result = await run(
            `INSERT INTO services (salon_id, name, description, price, duration, category, shampoo_usage, dye_usage, oxidant_usage, general_usage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [salonId, name, description || '', price, duration, category || '', shampoo_usage || 0, dye_usage || 0, oxidant_usage || 0, general_usage || 0]
        );

        console.log('✅ Service created:', result.lastID);
        res.json({ success: true, serviceId: result.lastID });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Hizmet ekle (with image upload)
router.post('/catalog', upload.fields([
    { name: 'before_image', maxCount: 1 },
    { name: 'after_image', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Catalog POST - req.body:', req.body);
        console.log('Catalog POST - req.files:', req.files);

        const { name, description, price, duration, category, shampoo_usage, dye_usage } = req.body;
        const salonId = req.user.salon_id;

        // Multer ile gelen değerler string olabilir, kontrol edelim
        if (!name || name.trim() === '' || !price || !duration) {
            console.log('Validation failed:', { name, price, duration });
            return res.status(400).json({ error: 'Zorunlu alanları doldurun' });
        }

        // Insert service
        const result = await run(
            `INSERT INTO services (salon_id, name, description, price, duration, category, shampoo_usage, dye_usage, oxidant_usage, general_usage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [salonId, name, description, price, duration, category, shampoo_usage || 0, dye_usage || 0, oxidant_usage || 0, general_usage || 0]
        );

        const serviceId = result.lastID;

        // Save before image if uploaded
        if (req.files && req.files.before_image) {
            const beforeImageUrl = '/uploads/services/' + req.files.before_image[0].filename;
            await run(
                `INSERT INTO service_images (service_id, image_type, image_url) VALUES (?, 'before', ?)`,
                [serviceId, beforeImageUrl]
            );
        }

        // Save after image if uploaded
        if (req.files && req.files.after_image) {
            const afterImageUrl = '/uploads/services/' + req.files.after_image[0].filename;
            await run(
                `INSERT INTO service_images (service_id, image_type, image_url) VALUES (?, 'after', ?)`,
                [serviceId, afterImageUrl]
            );
        }

        res.json({ success: true, serviceId });
    } catch (error) {
        console.error('Hizmet ekleme hatası:', error);
        res.status(500).json({ error: error.message || 'Sunucu hatası' });
    }
});

// Hizmet güncelle
router.patch('/catalog/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, duration, category, shampoo_usage, dye_usage, oxidant_usage, general_usage, is_active } = req.body;
        const salonId = req.user.salon_id;

        // Eğer sadece is_active güncelleniyorka (Toggle)
        if (is_active !== undefined && Object.keys(req.body).length === 1) {
            await run(
                'UPDATE services SET is_active = ? WHERE id = ? AND salon_id = ?',
                [is_active ? 1 : 0, id, salonId]
            );
        } else {
            const updates = [];
            const params = [];

            if (name) { updates.push('name = ?'); params.push(name); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            if (price) { updates.push('price = ?'); params.push(price); }
            if (duration) { updates.push('duration = ?'); params.push(duration); }
            if (category) { updates.push('category = ?'); params.push(category); }
            if (shampoo_usage !== undefined) { updates.push('shampoo_usage = ?'); params.push(shampoo_usage); }
            if (dye_usage !== undefined) { updates.push('dye_usage = ?'); params.push(dye_usage); }
            if (oxidant_usage !== undefined) { updates.push('oxidant_usage = ?'); params.push(oxidant_usage); }
            if (general_usage !== undefined) { updates.push('general_usage = ?'); params.push(general_usage); }

            if (updates.length > 0) {
                params.push(id, salonId);
                await run(
                    `UPDATE services SET ${updates.join(', ')} WHERE id = ? AND salon_id = ?`,
                    params
                );
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Hizmet güncelleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Stok listesi
router.get('/stock', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const stock = await query(
            'SELECT * FROM stock WHERE salon_id = ? ORDER BY item_name',
            [salonId]
        );

        res.json({ success: true, stock });
    } catch (error) {
        console.error('Stok listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Mevcut Markaları Getir
router.get('/stock/brands', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const brands = await query('SELECT DISTINCT brand FROM stock WHERE salon_id = ? AND brand IS NOT NULL', [salonId]);
        res.json({ success: true, brands: brands.map(b => b.brand) });
    } catch (error) {
        res.status(500).json({ error: 'Markalar alınamadı' });
    }
});

// Fiziksel Sayım Başlat/Kaydet (Fire Analizi)
router.post('/stock/count', async (req, res) => {
    try {
        const { stock_id, physical_quantity, notes } = req.body;
        const salonId = req.user.salon_id;

        const currentStock = await queryOne('SELECT quantity FROM stock WHERE id = ? AND salon_id = ?', [stock_id, salonId]);
        if (!currentStock) return res.status(404).json({ error: 'Ürün bulunamadı' });

        const discrepancy = physical_quantity - currentStock.quantity;

        // 1. Sayımı kaydet
        const result = await run(
            `INSERT INTO stock_counts (salon_id, stock_id, system_quantity, physical_quantity, discrepancy, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [salonId, stock_id, currentStock.quantity, physical_quantity, discrepancy, notes]
        );

        // 2. Sistemsel stoğu güncelle
        await run('UPDATE stock SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?', [physical_quantity, stock_id]);

        // 3. FIRE (Kayıp) varsa Finans'a GIDER olarak yansıt
        if (discrepancy < 0) {
            const fireQty = Math.abs(discrepancy);
            const stockInfo = await queryOne('SELECT item_name, unit_cost FROM stock WHERE id = ?', [stock_id]);
            const fireCost = fireQty * (stockInfo?.unit_cost || 0);

            if (fireCost > 0) {
                await run(
                    `INSERT INTO transactions (salon_id, transaction_type, amount, description, created_at)
                     VALUES (?, 'expense', ?, ?, CURRENT_TIMESTAMP)`,
                    [salonId, fireCost, `Stok Firesi: ${stockInfo?.item_name || 'Ürün'} (${fireQty} birim)`]
                );
            }
        }

        res.json({ success: true, countId: result.lastID, discrepancy });
    } catch (error) {
        console.error('Sayım hatası:', error);
        res.status(500).json({ error: 'Sayım kaydedilemedi' });
    }
});

// Fire Analiz Raporu
router.get('/stock/fire-reports', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { startDate, endDate } = req.query;

        console.log('📊 Fire Reports Filter - Salon:', salonId, 'Dates:', { startDate, endDate });

        let sql = `SELECT sc.*, s.item_name, s.brand, s.unit 
                   FROM stock_counts sc 
                   JOIN stock s ON sc.stock_id = s.id 
                   WHERE sc.salon_id = ?`;
        const params = [salonId];

        if (startDate && startDate !== '') {
            sql += ` AND CAST(sc.count_date AS DATE) >= ?`;
            params.push(startDate);
        }
        if (endDate && endDate !== '') {
            sql += ` AND CAST(sc.count_date AS DATE) <= ?`;
            params.push(endDate);
        }

        sql += ` ORDER BY sc.count_date DESC`;

        console.log('🔍 Executing SQL:', sql, 'Params:', params);

        const reports = await query(sql, params);
        res.json({ success: true, reports });
    } catch (error) {
        console.error('Rapor hatası:', error);
        res.status(500).json({ error: 'Raporlar alınamadı' });
    }
});

// Toplu Stok Sayımı Kaydet
router.post('/stock/bulk-count', async (req, res) => {
    try {
        const { counts } = req.body; // Array of { stock_id, physical_quantity, notes }
        const salonId = req.user.salon_id;
        const now = new Date().toISOString();

        if (!counts || !Array.isArray(counts)) {
            return res.status(400).json({ error: 'Geçersiz veri formatı' });
        }

        // Not: SQLite'da transaction desteği için db.js'deki yapıyı kullanıyoruz.
        // Ancak bu basit implementasyonda tek tek run kullanacağız. 
        // Gerçek bir prod ortamında transaction kullanılması önerilir.

        for (const item of counts) {
            const { stock_id, physical_quantity, notes } = item;

            // Mevcut stoğu al
            const currentStock = await queryOne('SELECT quantity FROM stock WHERE id = ? AND salon_id = ?', [stock_id, salonId]);
            if (!currentStock) continue;

            const discrepancy = physical_quantity - currentStock.quantity;

            // 1. Sayım kaydını at
            await run(
                `INSERT INTO stock_counts (salon_id, stock_id, system_quantity, physical_quantity, discrepancy, notes, count_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [salonId, stock_id, currentStock.quantity, physical_quantity, discrepancy, notes || 'Toplu sayım', now]
            );

            // 2. Stok miktarını güncelle
            await run(
                'UPDATE stock SET quantity = ?, last_updated = ? WHERE id = ?',
                [physical_quantity, now, stock_id]
            );

            // 3. FIRE (Kayıp) varsa Finans'a GIDER olarak yansıt
            if (discrepancy < 0) {
                const fireQty = Math.abs(discrepancy);
                const stockInfo = await queryOne('SELECT item_name, unit_cost FROM stock WHERE id = ?', [stock_id]);
                const fireCost = fireQty * (stockInfo?.unit_cost || 0);

                if (fireCost > 0) {
                    await run(
                        `INSERT INTO transactions (salon_id, transaction_type, amount, description, created_at)
                         VALUES (?, 'expense', ?, ?, ?)`,
                        [salonId, fireCost, `Toplu Sayım Firesi: ${stockInfo?.item_name || 'Ürün'} (${fireQty} birim)`, now]
                    );
                }
            }
        }

        res.json({ success: true, message: 'Toplu sayım başarıyla kaydedildi' });
    } catch (error) {
        console.error('Toplu sayım hatası:', error);
        res.status(500).json({ error: 'Toplu sayım kaydedilemedi' });
    }
});

// Stok ekle/güncelle
router.post('/stock', async (req, res) => {
    try {
        const { item_name, item_type, quantity, unit, unit_cost } = req.body;
        const salonId = req.user.salon_id;

        const result = await run(
            `INSERT INTO stock (salon_id, item_name, item_type, quantity, unit, unit_cost)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [salonId, item_name, item_type, quantity, unit, unit_cost]
        );

        res.json({ success: true, stockId: result.id });
    } catch (error) {
        console.error('Stok ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon analytics


// Randevu Oluştur (Manual)
router.post('/appointments', async (req, res) => {
    try {
        const { customer_name, customer_phone, service_id, staff_id, appointment_date, appointment_time, notes } = req.body;
        const salonId = req.user.salon_id;

        // Validation
        if (!customer_name || !service_id || !staff_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ error: 'Eksik bilgi: Müşteri adı, hizmet, personel, tarih ve saat zorunludur.' });
        }

        const result = await run(
            `INSERT INTO appointments (salon_id, service_id, staff_id, customer_name, customer_phone, appointment_date, appointment_time, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [salonId, service_id, staff_id, customer_name, customer_phone, appointment_date, appointment_time, notes || '']
        );

        res.status(201).json({ success: true, id: result.lastID, message: 'Randevu oluşturuldu' });
    } catch (error) {
        console.error('Randevu oluşturma hatası:', error);
        res.status(500).json({ error: 'Randevu oluşturulamadı' });
    }
});

// Randevu tamamlama - Otomatik finans kaydı
router.post('/appointments/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        // Randevu bilgilerini al
        const appointment = await queryOne(
            `SELECT a.*, s.price, s.shampoo_usage, s.dye_usage, s.oxidant_usage, s.general_usage
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.id = ? AND a.salon_id = ?`,
            [id, salonId]
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Randevu bulunamadı' });
        }

        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'Randevu zaten tamamlanmış' });
        }

        const now = new Date().toISOString();

        // 1. Randevuyu tamamla
        await run(
            'UPDATE appointments SET status = ?, completed_at = ? WHERE id = ?',
            ['completed', now, id]
        );

        // 1.5 Aura Puanı ödülü (Sadakat Sistemi)
        const customer = await queryOne('SELECT id FROM users WHERE phone = ?', [appointment.customer_phone]);
        if (customer) {
            await run('UPDATE users SET aura_points = aura_points + 10 WHERE id = ?', [customer.id]);
        }

        // 2. Finans kaydı oluştur (Gelir)
        await run(
            `INSERT INTO transactions (salon_id, appointment_id, transaction_type, amount, description, created_at)
             VALUES (?, ?, 'income', ?, ?, ?)`,
            [salonId, id, appointment.price, `Randevu #${id} - ${appointment.customer_name}`, now]
        );

        // 3. Reçete bazlı malzeme maliyeti hesapla VE stoktan düş
        let materialCost = 0;

        // Hizmetin reçetesini getir
        const recipes = await query(
            `SELECT sr.*, s.unit_cost, s.item_name 
             FROM service_recipes sr
             JOIN stock s ON sr.stock_id = s.id
             WHERE sr.service_id = ?`,
            [appointment.service_id]
        );

        for (const recipe of recipes) {
            const usageAmount = recipe.quantity;
            const cost = usageAmount * recipe.unit_cost;
            materialCost += cost;

            // Stoktan düş
            await run(
                'UPDATE stock SET quantity = quantity - ?, last_updated = ? WHERE id = ?',
                [usageAmount, now, recipe.stock_id]
            );

            // Stok hareketi kaydet
            await run(
                `INSERT INTO stock_movements (stock_id, appointment_id, movement_type, quantity, notes, created_at)
                 VALUES (?, ?, 'out', ?, ?, ?)`,
                [recipe.stock_id, id, usageAmount, `Randevu #${id} - ${appointment.customer_name}`, now]
            );
        }

        // Opsiyonel: Eski alanlar (shampoo_usage vb.) hala doluysa ve reçete yoksa eski mantıkla devam et (Geriye dönük uyumluluk)
        if (recipes.length === 0) {
            // Şampuan maliyeti ve stok düşümü
            if (appointment.shampoo_usage > 0) {
                const shampooStock = await queryOne(
                    `SELECT id, unit_cost, quantity FROM stock 
                     WHERE salon_id = ? AND item_type = 'shampoo' 
                     ORDER BY last_updated DESC LIMIT 1`,
                    [salonId]
                );

                if (shampooStock) {
                    materialCost += (appointment.shampoo_usage * shampooStock.unit_cost);
                    await run('UPDATE stock SET quantity = quantity - ? WHERE id = ?', [appointment.shampoo_usage, shampooStock.id]);
                }
            }
            // Boya maliyeti ve stok düşümü
            if (appointment.dye_usage > 0) {
                const dyeStock = await queryOne(
                    `SELECT id, unit_cost, quantity FROM stock 
                     WHERE salon_id = ? AND item_type = 'dye' 
                     ORDER BY last_updated DESC LIMIT 1`,
                    [salonId]
                );
                if (dyeStock) {
                    materialCost += (appointment.dye_usage * dyeStock.unit_cost);
                    await run('UPDATE stock SET quantity = quantity - ? WHERE id = ?', [appointment.dye_usage, dyeStock.id]);
                }
            }
            // Oksidan maliyeti ve stok düşümü
            if (appointment.oxidant_usage > 0) {
                const oxidantStock = await queryOne(
                    `SELECT id, unit_cost, quantity FROM stock 
                     WHERE salon_id = ? AND item_type = 'oxidant' 
                     ORDER BY last_updated DESC LIMIT 1`,
                    [salonId]
                );

                if (oxidantStock) {
                    materialCost += (appointment.oxidant_usage * oxidantStock.unit_cost);
                    await run('UPDATE stock SET quantity = quantity - ? WHERE id = ?', [appointment.oxidant_usage, oxidantStock.id]);
                }
            }
            // Genel ürün maliyeti ve stok düşümü
            if (appointment.general_usage > 0) {
                const generalStock = await queryOne(
                    `SELECT id, unit_cost, quantity FROM stock 
                     WHERE salon_id = ? AND item_type = 'other' 
                     ORDER BY last_updated DESC LIMIT 1`,
                    [salonId]
                );

                if (generalStock) {
                    materialCost += (appointment.general_usage * generalStock.unit_cost);
                    await run('UPDATE stock SET quantity = quantity - ? WHERE id = ?', [appointment.general_usage, generalStock.id]);
                }
            }
        }

        // 4. Personelin pirim oranını al ve komisyon hesapla
        const staffInfo = await queryOne(
            'SELECT commission_rate FROM users WHERE id = ?',
            [appointment.staff_id]
        );
        const commissionRate = staffInfo?.commission_rate || 0.15; // Varsayılan %15
        const netRevenue = appointment.price - materialCost;
        const commissionAmount = netRevenue * commissionRate;

        // 5. Komisyon kaydı oluştur
        await run(
            `INSERT INTO commissions (staff_id, appointment_id, service_price, material_cost, commission_amount, commission_rate, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [appointment.staff_id, id, appointment.price, materialCost, commissionAmount, commissionRate, now]
        );

        res.json({
            success: true,
            message: 'Randevu tamamlandı',
            finance: {
                revenue: appointment.price,
                materialCost,
                commission: commissionAmount
            }
        });

    } catch (error) {
        console.error('Randevu tamamlama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
});

// Bekleyen personel onayları
router.get('/pending-staff', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const pendingStaff = await query(
            `SELECT id, username, full_name, email, phone, created_at
             FROM users
             WHERE salon_id = ? AND role = 'STAFF' AND is_active = 0
             ORDER BY created_at DESC`,
            [salonId]
        );

        res.json({ success: true, pendingStaff });
    } catch (error) {
        console.error('Bekleyen personel hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel onaylama
router.post('/staff/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        await run(
            "UPDATE users SET is_active = 1 WHERE id = ? AND salon_id = ? AND role = 'STAFF'",
            [id, salonId]
        );

        res.json({ success: true, message: 'Personel onaylandı' });
    } catch (error) {
        console.error('Personel onaylama hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Personel reddetme
router.post('/staff/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        await run(
            "DELETE FROM users WHERE id = ? AND salon_id = ? AND role = 'STAFF' AND is_active = 0",
            [id, salonId]
        );

        res.json({ success: true, message: 'Personel reddedildi' });
    } catch (error) {
        console.error('Personel reddetme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Müşteri Özet ve Geçmişi (AI Destekli)
router.get('/customer-summary/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const salonId = req.user.salon_id;

        // Müşteri bilgilerini ve son 5 randevusunu al
        const history = await query(
            `SELECT a.*, s.name as service_name, s.category as service_category
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.customer_phone = ? AND a.salon_id = ?
             ORDER BY a.appointment_date DESC LIMIT 5`,
            [phone, salonId]
        );

        if (history.length === 0) {
            return res.json({ success: true, summary: 'Bu müşteri için henüz bir geçmiş bulunmuyor.' });
        }

        // AI'dan özet iste (Basitleştirilmiş)
        const historyText = history.map(h =>
            `${h.appointment_date}: ${h.service_name} (${h.status})`
        ).join(', ');

        const aiService = require('../services/ai-service');
        const summary = await aiService.generateCustomerSummary(historyText, phone);

        res.json({ success: true, history, summary });
    } catch (error) {
        console.error('Müşteri summary hatası:', error);
        res.status(500).json({ error: 'Müşteri bilgileri alınamadı' });
    }
});

// Finansal Tahmin (AI Destekli)
router.get('/financial-forecast', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        // 30 günlük özeti hesapla (routes/ai.js'deki logic ile benzer)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const revenueResult = await queryOne(
            `SELECT SUM(s.price) as total_revenue
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.salon_id = ? AND a.status = 'completed' AND a.appointment_date >= ?`,
            [salonId, dateStr]
        );

        const costsResult = await queryOne(
            `SELECT SUM(unit_cost * quantity) as total_costs
             FROM stock
             WHERE salon_id = ?`,
            [salonId]
        );

        const summary = {
            revenue: revenueResult?.total_revenue || 0,
            costs: costsResult?.total_costs || 0,
            profit: (revenueResult?.total_revenue || 0) - (costsResult?.total_costs || 0)
        };

        const aiService = require('../services/ai-service');
        const forecast = await aiService.generateFinancialForecast(summary, salonId);

        res.json({ success: true, summary, forecast });
    } catch (error) {
        console.error('Finansal tahmin hatası:', error);
        res.status(500).json({ error: 'Tahmin oluşturulamadı' });
    }
});


// --- FİNANS YÖNETİMİ ---

// Finansal istatistikler ve grafik verileri
// Finansal istatistikler ve grafik verileri (Fixed)
router.get('/finance/stats', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { period = 'month' } = req.query;

        console.log(`📊 Finance Stats Request - Salon: ${salonId}, Period: ${period}`);

        // Date calculation in JS for better SQLite compatibility
        const now = new Date();
        let startDate = new Date();

        if (period === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            startDate.setDate(1); // Start of month
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'year') {
            startDate.setMonth(0, 1); // Start of year
            startDate.setHours(0, 0, 0, 0);
        } else {
            // Default 30 days
            startDate.setDate(now.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
        }

        const dateStr = startDate.toISOString();
        console.log('📅 Date Filter:', dateStr);

        // 1. Özet Rakamlar
        const summaries = await queryOne(`
            SELECT 
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense
            FROM transactions 
            WHERE salon_id = ? AND created_at >= ?
        `, [salonId, dateStr]);

        // 2. Trend Verisi (Grafik için) - Son 30 gün sabit
        const trendStart = new Date();
        trendStart.setDate(trendStart.getDate() - 30);
        const trendDateStr = trendStart.toISOString();

        const trend = await query(`
            SELECT 
                CAST(created_at AS DATE) as date,
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE salon_id = ? AND created_at >= ?
            GROUP BY date
            ORDER BY date
        `, [salonId, trendDateStr]);

        // 3. Son İşlemler (Tablo için)
        const recentTransactions = await query(`
            SELECT * FROM transactions 
            WHERE salon_id = ? 
            ORDER BY created_at DESC LIMIT 50
        `, [salonId]);

        console.log('✅ Finance data fetched successfully');

        res.json({
            success: true,
            stats: {
                income: Number(summaries?.total_income || 0),
                expense: Number(summaries?.total_expense || 0),
                net: Number(summaries?.total_income || 0) - Number(summaries?.total_expense || 0)
            },
            trend: trend || [],
            transactions: recentTransactions || []
        });
    } catch (error) {
        console.error('❌ Finans istatistik hatası:', error);
        res.status(500).json({ error: 'Finans verileri alınamadı: ' + error.message });
    }
});

// Manuel işlem ekle (Gelir/Gider)
router.post('/finance/transaction', async (req, res) => {
    try {
        const { type, amount, description, date } = req.body;
        const salonId = req.user.salon_id;

        await run(
            `INSERT INTO transactions (salon_id, transaction_type, amount, description, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [salonId, type, amount, description, date || new Date().toISOString()]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('İşlem ekleme hatası:', error);
        res.status(500).json({ error: 'İşlem kaydedilemedi' });
    }
});

// İşlem sil
router.delete('/finance/transaction/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;

        await run('DELETE FROM transactions WHERE id = ? AND salon_id = ?', [id, salonId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'İşlem silinemedi' });
    }
});

// --- SALON AYARLARI ---

// Ayarları getir
router.get('/settings', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const salon = await queryOne('SELECT * FROM salons WHERE id = ?', [salonId]);
        const hours = await query('SELECT * FROM salon_hours WHERE salon_id = ? ORDER BY day_of_week', [salonId]);

        res.json({ success: true, salon, hours });
    } catch (error) {
        console.error('Ayarlar yüklenemedi hatası:', error);
        res.status(500).json({ error: 'Ayarlar yüklenemedi' });
    }
});

// Salon profilini güncelle
router.patch('/settings', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { name, phone, email, address } = req.body;

        await run(
            `UPDATE salons SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`,
            [name, phone, email, address, salonId]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Profil güncellenemedi' });
    }
});

// Çalışma saatlerini güncelle
router.post('/settings/hours', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { hours } = req.body;

        for (const h of hours) {
            await run(
                `INSERT INTO salon_hours (salon_id, day_of_week, start_time, end_time, is_closed)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(salon_id, day_of_week) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_closed = EXCLUDED.is_closed`,
                [salonId, h.day, h.start, h.end, h.is_closed ? 1 : 0]
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Haftalık çalışma saatleri kaydedilemedi' });
    }
});

// Şifre değiştir
router.patch('/settings/password', async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const user = await queryOne('SELECT password FROM users WHERE id = ?', [userId]);
        const match = await bcrypt.compare(oldPassword, user.password);

        if (!match) {
            return res.status(400).json({ error: 'Mevcut şifre hatalı' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Şifre güncellenemedi' });
    }
});

// Featured Başvurusu Yap
router.post('/featured/request', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const { duration_days, notes } = req.body;
        const now = new Date().toISOString();

        // Check if already featured
        const salon = await queryOne('SELECT is_featured, featured_until FROM salons WHERE id = ?', [salonId]);
        if (salon.is_featured && new Date(salon.featured_until) > new Date()) {
            return res.status(400).json({ error: 'Salonunuz zaten featured durumunda' });
        }

        // Check for pending request
        const pending = await queryOne(
            "SELECT id FROM featured_requests WHERE salon_id = ? AND status = 'pending'",
            [salonId]
        );
        if (pending) {
            return res.status(400).json({ error: 'Zaten bekleyen bir başvurunuz var' });
        }

        // Create request
        await run(
            `INSERT INTO featured_requests (salon_id, requested_at, duration_days, notes)
             VALUES (?, ?, ?, ?)`,
            [salonId, now, duration_days || 7, notes || '']
        );

        res.json({ success: true, message: 'Featured başvurunuz alındı. Onay bekleniyor.' });
    } catch (error) {
        console.error('Featured başvuru hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Featured Durumunu Kontrol Et
router.get('/featured/status', async (req, res) => {
    try {
        const salonId = req.user.salon_id;

        const salon = await queryOne(
            'SELECT is_featured, featured_until, featured_count FROM salons WHERE id = ?',
            [salonId]
        );

        const pendingRequest = await queryOne(
            "SELECT * FROM featured_requests WHERE salon_id = ? AND status = 'pending'",
            [salonId]
        );

        res.json({
            success: true,
            is_featured: salon.is_featured === 1,
            featured_until: salon.featured_until,
            featured_count: salon.featured_count || 0,
            has_pending_request: !!pendingRequest
        });
    } catch (error) {
        console.error('Featured durum hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// --- SALON SHOWCASE (VİTRİN) YÖNETİMİ ---

// Vitrin öğelerini listele
router.get('/showcase', async (req, res) => {
    try {
        const salonId = req.user.salon_id;
        const items = await query(
            'SELECT * FROM salon_showcase WHERE salon_id = ? ORDER BY created_at DESC',
            [salonId]
        );
        res.json({ success: true, items });
    } catch (error) {
        console.error('Vitrin listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Vitrin öğesi ekle
router.post('/showcase', upload.single('showcase_image'), async (req, res) => {
    try {
        const { type, title, description } = req.body;
        const salonId = req.user.salon_id;
        const imageUrl = req.file ? '/uploads/showcase/' + req.file.filename : null;

        if (!title || !type) {
            return res.status(400).json({ error: 'Başlık ve tür zorunludur' });
        }

        const result = await run(
            'INSERT INTO salon_showcase (salon_id, type, title, description, image_url) VALUES (?, ?, ?, ?, ?)',
            [salonId, type, title, description, imageUrl]
        );

        res.json({ success: true, itemId: result.lastID });
    } catch (error) {
        console.error('Vitrin ekleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Vitrin öğesi sil
router.delete('/showcase/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const salonId = req.user.salon_id;
        await run('DELETE FROM salon_showcase WHERE id = ? AND salon_id = ?', [id, salonId]);
        res.json({ success: true, message: 'Öğe silindi' });
    } catch (error) {
        console.error('Vitrin silme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Vitrin öğesi aktif/pasif yap
router.patch('/showcase/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const salonId = req.user.salon_id;

        await run(
            'UPDATE salon_showcase SET is_active = ? WHERE id = ? AND salon_id = ?',
            [is_active ? 1 : 0, id, salonId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Vitrin durum hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// DEBUG ENDPOINT
router.get('/debug/hours/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const hours = await query('SELECT * FROM staff_working_hours WHERE staff_id = ?', [id]);
        res.json({ id, count: hours.length, data: hours });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
