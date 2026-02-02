const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne, run } = require('../database/db');

const router = express.Router();

// Login endpoint - Tüm kullanıcı tipleri
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
        }

        // Kullanıcıyı bul
        const user = await queryOne(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Şifre kontrolü
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }

        // Patron ise salon onay kontrolü
        if (user.role === 'PATRON') {
            const salon = await queryOne(
                'SELECT is_approved, is_active FROM salons WHERE id = ?',
                [user.salon_id]
            );

            if (!salon || !salon.is_approved) {
                return res.status(403).json({ error: 'Salonunuz henüz onaylanmamış' });
            }

            if (!salon.is_active) {
                return res.status(403).json({ error: 'Salonunuz askıya alınmış' });
            }
        }

        // JWT token oluştur
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                salon_id: user.salon_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                salon_id: user.salon_id
            }
        });

    } catch (error) {
        console.error('Login hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Yeni salon kaydı
router.post('/register-salon', async (req, res) => {
    try {
        const { salonName, ownerName, address, phone, email, username, password } = req.body;

        // Validasyon
        if (!salonName || !ownerName || !username || !password) {
            return res.status(400).json({ error: 'Tüm zorunlu alanları doldurun' });
        }

        // Kullanıcı adı kontrolü
        const existingUser = await queryOne(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Salon oluştur
        const salonResult = await run(
            `INSERT INTO salons (name, owner_name, address, phone, email, is_approved, subscription_status)
             VALUES (?, ?, ?, ?, ?, 0, 'trial')`,
            [salonName, ownerName, address, phone, email]
        );

        // Patron kullanıcısı oluştur
        await run(
            `INSERT INTO users (username, password, role, full_name, email, phone, salon_id, is_active)
             VALUES (?, ?, 'PATRON', ?, ?, ?, ?, 1)`,
            [username, hashedPassword, ownerName, email, phone, salonResult.id]
        );

        res.json({
            success: true,
            message: 'Salon kaydınız alındı. Onay bekliyor.'
        });

    } catch (error) {
        console.error('Salon kayıt hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Token doğrulama
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token bulunamadı' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Kullanıcı hala aktif mi kontrol et
        const user = await queryOne(
            'SELECT id, username, role, full_name, salon_id FROM users WHERE id = ? AND is_active = 1',
            [decoded.id]
        );

        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({ success: true, user });

    } catch (error) {
        res.status(403).json({ error: 'Geçersiz token' });
    }
});

module.exports = router;
