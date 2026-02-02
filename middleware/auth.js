const jwt = require('jsonwebtoken');

// JWT token doğrulama middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Geçersiz token' });
        }
        req.user = user;
        next();
    });
}

// Role-based access control
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Kimlik doğrulaması gerekli' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        next();
    };
}

// Salon sahibi kontrolü
function requireSalonOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Kimlik doğrulaması gerekli' });
    }

    if (req.user.role !== 'PATRON' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Sadece salon patronları erişebilir' });
    }

    next();
}

// Personel veya patron kontrolü
function requireStaffOrOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Kimlik doğrulaması gerekli' });
    }

    if (!['STAFF', 'PATRON', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    next();
}

module.exports = {
    authenticateToken,
    requireRole,
    requireSalonOwner,
    requireStaffOrOwner
};
