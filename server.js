require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth');
const superadminRoutes = require('./routes/superadmin');
const patronRoutes = require('./routes/patron');
const staffRoutes = require('./routes/staff');
const publicRoutes = require('./routes/public');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// --- GÜVENLİK ZIRHI (Security Layer) ---

// 1. Helmet: Güvenlik başlıklarını otomatik ekler
app.use(helmet({
    contentSecurityPolicy: false, // Local font/image sorunlarını önlemek için dev modunda kapalı
    crossOriginEmbedderPolicy: false
}));

// 2. Genel Rate Limiting: 15 dakikada en fazla 500 istek
const defaultLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Çok fazla istek yaptınız. Lütfen biraz bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', defaultLimit);

// 3. Hassas Endpoint Limiting: Login ve AI için daha sıkı (15 dk'da 50 istek)
const strictLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Bu işlem için sınır doldu. Lütfen 15 dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', strictLimit);
app.use('/api/ai/', strictLimit);

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(express.urlencoded({ extended: true }));

// Static files
const publicPath = path.join(process.cwd(), 'public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// API Routes
app.use('/api/public', (req, res, next) => {
    console.log(`--- PUBLIC ROUTER HIT --- ${req.method} ${req.url}`);
    next();
}, publicRoutes);
app.get('/api/test-debug', (req, res) => res.json({ status: 'OK', message: 'API is working' }));
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/patron/analytics', analyticsRoutes);
app.use('/api/patron', patronRoutes);

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
    console.warn(`[404] No route found for: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
});

// Database başlat ve server'ı çalıştır
async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════╗');
            console.log('║     🎨 kuaför randevu SaaS Server 🎨      ║');
            console.log('╚════════════════════════════════════════╝');
            const { getDb } = require('./database/db');
            const db = getDb();
            const dbName = db.constructor.name === 'Pool' ? 'PostgreSQL (Supabase/Render)' : 'SQLite (Local beautyflow.db)';

            console.log(`✅ kuaför randevu backend is running on port ${PORT}`);
            console.log(`🔗 Local development: http://localhost:${PORT}`);
            console.log(`✅ Database: ${dbName}`);
            console.log('');
            console.log('📍 Endpoints:');
            console.log('   - Landing Page: http://localhost:' + PORT);
            console.log('   - Login: http://localhost:' + PORT + '/login.html');
            console.log('   - API: http://localhost:' + PORT + '/api/*');
            console.log('');
            console.log('🔐 Super Admin Login:');
            console.log('   Username: superadmin');
            console.log('   Password: admin123');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Server başlatma hatası:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Server kapatılıyor...');
    const { closeDatabase } = require('./database/db');
    await closeDatabase();
    process.exit(0);
});

startServer();
