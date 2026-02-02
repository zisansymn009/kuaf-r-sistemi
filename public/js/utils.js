// BeautyFlow SaaS - Utility Functions

const API_BASE = window.location.origin + '/api';

// Token yönetimi
const TokenManager = {
    set: (token) => localStorage.setItem('beautyflow_token', token),
    get: () => localStorage.getItem('beautyflow_token'),
    remove: () => localStorage.removeItem('beautyflow_token'),
    getHeader: () => {
        const token = TokenManager.get();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// User yönetimi
const UserManager = {
    set: (user) => localStorage.setItem('beautyflow_user', JSON.stringify(user)),
    get: () => {
        const user = localStorage.getItem('beautyflow_user');
        return user ? JSON.parse(user) : null;
    },
    remove: () => localStorage.removeItem('beautyflow_user'),
    isLoggedIn: () => !!TokenManager.get() && !!UserManager.get()
};

// API çağrıları
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...TokenManager.getHeader(),
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Bir hata oluştu');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Tarih formatla
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Tarih ve saat formatla
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Para formatla
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

// Süre formatla (dakika -> saat:dakika)
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours} saat ${mins} dk`;
    }
    return `${mins} dk`;
}

// Toast bildirimi
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)'
    };

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading spinner göster/gizle
function showLoading(element) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.margin = '2rem auto';
    element.innerHTML = '';
    element.appendChild(spinner);
}

function hideLoading(element) {
    const spinner = element.querySelector('.spinner');
    if (spinner) spinner.remove();
}

// Confirm dialog
function confirmAction(message) {
    return window.confirm(message);
}

// Logout
function logout() {
    TokenManager.remove();
    UserManager.remove();
    window.location.href = '/login.html';
}

// Rol kontrolü
function checkRole(requiredRole) {
    const user = UserManager.get();
    if (!user || user.role !== requiredRole) {
        showToast('Bu sayfaya erişim yetkiniz yok', 'error');
        setTimeout(() => logout(), 1500);
        return false;
    }
    return true;
}

// Animasyonlar için CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
