const express = require('express');
const { query, queryOne, run } = require('../database/db');

const router = express.Router();

// Aktif salonları listele (Filtreli)
router.get('/salons', async (req, res) => {
    try {
        const { city, district } = req.query;
        let sql = `SELECT id, name, address, phone, city, district
                  FROM salons
                  WHERE is_approved = 1 AND is_active = 1`;
        const params = [];

        if (city) {
            sql += ` AND city = ?`;
            params.push(city);
        }
        if (district) {
            sql += ` AND district = ?`;
            params.push(district);
        }

        sql += ` ORDER BY name`;

        const salons = await query(sql, params);
        res.json({ success: true, salons });
    } catch (error) {
        console.error('Salon listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Kayıtlı kuaförlerin bulunduğu aktif konumları (İl/İlçe) listele
router.get('/locations', async (req, res) => {
    try {
        const { city } = req.query;

        if (city) {
            // Seçili ildeki ilçeleri getir
            const districts = await query(
                `SELECT DISTINCT district FROM salons 
                 WHERE city = ? AND is_approved = 1 AND is_active = 1 AND district IS NOT NULL
                 ORDER BY district`,
                [city]
            );
            return res.json({ success: true, districts: districts.map(d => d.district) });
        } else {
            // Tüm aktif illeri getir
            const cities = await query(
                `SELECT DISTINCT city FROM salons 
                 WHERE is_approved = 1 AND is_active = 1 AND city IS NOT NULL
                 ORDER BY city`
            );
            return res.json({ success: true, cities: cities.map(c => c.city) });
        }
    } catch (error) {
        console.error('Konum listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Tekil salon bilgisi
router.get('/salons/:id', async (req, res) => {
    console.log('--- ENTERING /salons/:id ---');
    console.log('Params:', req.params);
    try {
        const { id } = req.params;
        const salon = await queryOne('SELECT * FROM salons WHERE id = ?', [id]);
        if (!salon) return res.status(404).json({ error: 'Salon bulunamadı' });
        res.json(salon);
    } catch (error) {
        console.error('Salon detayı hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon hizmetleri (landing page için)
router.get('/salons/:id/services', async (req, res) => {
    try {
        const { id } = req.params;

        const services = await query(
            `SELECT 
                s.*,
                STRING_AGG(CASE WHEN si.image_type = 'before' THEN si.image_url END, ',') as before_image,
                STRING_AGG(CASE WHEN si.image_type = 'after' THEN si.image_url END, ',') as after_image
             FROM services s
             LEFT JOIN service_images si ON s.id = si.service_id
             WHERE s.salon_id = ? AND s.is_active = 1
             GROUP BY s.id, s.salon_id, s.name, s.description, s.price, s.duration, s.category, s.shampoo_usage, s.dye_usage, s.oxidant_usage, s.general_usage, s.is_active, s.created_at, s.is_featured, s.featured_until
             ORDER BY s.category, s.name`,
            [id]
        );

        res.json({ success: true, services });
    } catch (error) {
        console.error('Salon hizmetleri hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon personeli (landing page için)
router.get('/salons/:id/staff', async (req, res) => {
    try {
        const { id } = req.params;

        const staff = await query(
            `SELECT id, full_name FROM users 
             WHERE salon_id = ? AND role = 'STAFF' AND is_active = 1
             ORDER BY full_name`,
            [id]
        );

        res.json({ success: true, staff });
    } catch (error) {
        console.error('Salon personeli hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Salon kataloğu (Before/After dahil) - eski endpoint
router.get('/catalog/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;

        const services = await query(
            `SELECT 
                s.*,
                STRING_AGG(CASE WHEN si.image_type = 'before' THEN si.image_url END, ',') as before_images,
                STRING_AGG(CASE WHEN si.image_type = 'after' THEN si.image_url END, ',') as after_images
             FROM services s
             LEFT JOIN service_images si ON s.id = si.service_id
             WHERE s.salon_id = ? AND s.is_active = 1
             GROUP BY s.id, s.salon_id, s.name, s.description, s.price, s.duration, s.category, s.shampoo_usage, s.dye_usage, s.oxidant_usage, s.general_usage, s.is_active, s.created_at, s.is_featured, s.featured_until
             ORDER BY s.category, s.name`,
            [salonId]
        );

        res.json({ success: true, services });
    } catch (error) {
        console.error('Katalog hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Müsait personel ve saatler
router.get('/available-slots', async (req, res) => {
    try {
        const { salonId, serviceId, date } = req.query;

        if (!salonId || !serviceId || !date) {
            return res.status(400).json({ error: 'Salon, hizmet ve tarih gerekli' });
        }

        // Hizmet bilgisi
        const service = await queryOne(
            'SELECT duration FROM services WHERE id = ?',
            [serviceId]
        );

        if (!service) {
            return res.status(404).json({ error: 'Hizmet bulunamadı' });
        }

        // Salondaki personeller
        const staff = await query(
            `SELECT id, full_name FROM users 
             WHERE salon_id = ? AND role = 'STAFF' AND is_active = 1`,
            [salonId]
        );

        // Her personel için dolu saatleri bul
        const availability = [];

        for (const person of staff) {
            const bookedSlots = await query(
                `SELECT appointment_time, 
                        (SELECT duration FROM services WHERE id = service_id) as duration
                 FROM appointments
                 WHERE staff_id = ? AND appointment_date = ? AND status != 'cancelled'`,
                [person.id, date]
            );

            // Çalışma saatleri: 09:00 - 19:00
            const workingHours = [];
            for (let hour = 9; hour < 19; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                    // Bu saat dolu mu kontrol et
                    const isBooked = bookedSlots.some(slot => {
                        const slotStart = slot.appointment_time;
                        const slotEnd = addMinutes(slotStart, slot.duration);
                        const currentEnd = addMinutes(time, service.duration);

                        return (time >= slotStart && time < slotEnd) ||
                            (currentEnd > slotStart && currentEnd <= slotEnd);
                    });

                    if (!isBooked) {
                        workingHours.push(time);
                    }
                }
            }

            availability.push({
                staffId: person.id,
                staffName: person.full_name,
                availableSlots: workingHours
            });
        }

        res.json({ success: true, availability });

    } catch (error) {
        console.error('Müsaitlik kontrolü hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Randevu oluştur (kayıtsız müşteri)
router.post('/book-appointment', async (req, res) => {
    try {
        const { salonId, serviceId, staffId, customerName, customerPhone, appointmentDate, appointmentTime } = req.body;

        // Validasyon
        if (!salonId || !serviceId || !customerName || !customerPhone || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ error: 'Tüm alanları doldurun' });
        }

        // Çakışma kontrolü (Sadece personel seçilmişse)
        if (staffId) {
            const conflict = await queryOne(
                `SELECT id FROM appointments 
                 WHERE staff_id = ? AND appointment_date = ? AND appointment_time = ? 
                 AND status != 'cancelled'`,
                [staffId, appointmentDate, appointmentTime]
            );

            if (conflict) {
                return res.status(400).json({ error: 'Bu saat dolu, lütfen başka bir saat seçin' });
            }
        }

        // Randevu oluştur
        const result = await run(
            `INSERT INTO appointments (salon_id, service_id, staff_id, customer_name, customer_phone, 
                                      appointment_date, appointment_time, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [salonId, serviceId, staffId, customerName, customerPhone, appointmentDate, appointmentTime]
        );

        res.json({
            success: true,
            appointmentId: result.id,
            message: 'Randevunuz oluşturuldu'
        });

    } catch (error) {
        console.error('Randevu oluşturma hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Helper: Saate dakika ekle
function addMinutes(time, minutes) {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute + minutes;
    const newHour = Math.floor(totalMinutes / 60);
    const newMinute = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
}

// Personel kayıt (onay bekleyecek)
router.post('/staff-register', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { salon_id, full_name, email, phone, username, password } = req.body;

        if (!salon_id || !full_name || !username || !password) {
            return res.status(400).json({ error: 'Zorunlu alanları doldurun' });
        }

        // Kullanıcı adı kontrolü
        const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(400).json({ error: 'Bu kullanıcı adı kullanılıyor' });
        }

        // Salon kontrolü
        const salon = await queryOne('SELECT id FROM salons WHERE id = ? AND is_active = 1', [salon_id]);
        if (!salon) {
            return res.status(400).json({ error: 'Geçersiz salon' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Personel kaydı oluştur (is_active = 0, onay bekliyor)
        await run(
            `INSERT INTO users (username, password, role, full_name, email, phone, salon_id, is_active)
             VALUES (?, ?, 'STAFF', ?, ?, ?, ?, 0)`,
            [username, hashedPassword, full_name, email, phone, salon_id]
        );

        res.json({ success: true, message: 'Başvurunuz alındı. Onay bekleniyor.' });
    } catch (error) {
        console.error('Personel kayıt hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Vitrin öğelerini listele (Kampanyalar + Çalışmalar)
router.get('/showcase', async (req, res) => {
    try {
        const { type } = req.query; // Opsiyonel filtre: campaign veya service_sample
        let sql = `
            SELECT v.*, s.name as salon_name 
            FROM salon_showcase v 
            JOIN salons s ON v.salon_id = s.id 
            WHERE v.is_active = 1 AND s.is_approved = 1 AND s.is_active = 1
        `;
        const params = [];

        if (type) {
            sql += ` AND v.type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY v.created_at DESC`;

        const items = await query(sql, params);
        res.json({ success: true, items });
    } catch (error) {
        console.error('Vitrin listesi hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Aura Smart Slots (AI-driven occupancy optimization)
router.get('/smart-slots/:salonId', async (req, res) => {
    try {
        const { salonId } = req.params;
        const daysToScan = 7;
        const smartSlots = [];

        // Scan next 7 days
        for (let i = 0; i < daysToScan; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Get total capacity (simplified: number of staff * working hours)
            const staffCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE salon_id = ? AND role = 'STAFF' AND is_active = 1", [salonId]);
            const totalHours = 10; // 09:00 - 19:00
            const maxAppointments = (staffCount.count || 1) * totalHours;

            // Get current appointments for this day
            const currentApts = await queryOne("SELECT COUNT(*) as count FROM appointments WHERE salon_id = ? AND appointment_date = ? AND status != 'cancelled'", [salonId, dateStr]);

            // Calculate occupancy
            const occupancy = (currentApts.count / maxAppointments) * 100;

            // If occupancy < 30%, mark as Happy Hour opportunity
            if (occupancy < 30) {
                smartSlots.push({
                    date: dateStr,
                    occupancy: Math.round(occupancy),
                    label: 'Happy Hour Fırsatı',
                    discount: '20%',
                    reason: 'Düşük yoğunluk bekleniyor'
                });
            }
        }

        res.json({ success: true, smartSlots });
    } catch (error) {
        console.error('Smart slots error:', error);
        res.status(500).json({ error: 'Fırsatlar hesaplanamadı' });
    }
});

// Aura Magazine - Global Trends
router.get('/trends-magazine', async (req, res) => {
    try {
        const aiService = require('../services/ai-service');
        const trends = await aiService.generateGlobalTrends();
        res.json({ success: true, trends });
    } catch (error) {
        console.error('Trends magazine error:', error);
        res.status(500).json({ error: 'Trendler yüklenemedi' });
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
