/**
 * AURA Patron Dashboard - Robust Hash-Based Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

// State
let currentSalon = null;

async function initDashboard() {
    try {
        const user = UserManager.get();
        if (!user || user.role !== 'PATRON') {
            window.location.href = '/login.html';
            return;
        }

        // 1. Setup Event Listeners First (Immediate reactivity)
        initEventListeners();

        // 2. Load Global Data (Non-blocking)
        loadSalonInfo();

        // 3. Trigger Initial Page from Hash
        const initialPage = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(initialPage);

    } catch (error) {
        console.error('Init error:', error);
    }
}

function initEventListeners() {
    // We rely on <a href="#page"> and window.onhashchange for navigation.
    // This is much more robust than individual onclick listeners.
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(page);
    });

    // Form Submits
    const forms = {
        'staffForm': handleStaffSubmit,
        'serviceForm': handleServiceSubmit,
        'stockForm': handleStockSubmit,
        'appointmentForm': handleAppointmentSubmit
    };

    Object.entries(forms).forEach(([id, handler]) => {
        const form = document.getElementById(id);
        if (form) form.onsubmit = handler;
    });
}

/**
 * Navigate to a specific section
 * This function only handles UI changes and triggers background data load.
 */
async function navigateTo(page) {
    if (!page) return;

    console.log('Navigating to:', page);

    // 1. Update Sidebar UI
    document.querySelectorAll('.nav-link').forEach(l => {
        if (l.getAttribute('href') === `#${page}`) {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });

    // 2. Show/Hide Sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    const activeSection = document.getElementById(`${page}-section`);
    if (activeSection) {
        activeSection.classList.add('active');
    } else {
        console.warn('Section not found:', page);
        // Fallback to dashboard if section missing
        if (page !== 'dashboard') return navigateTo('dashboard');
    }

    // 3. Update Title
    const titles = {
        dashboard: 'Dashboard',
        appointments: 'Randevu Yönetimi',
        staff: 'Personel Yönetimi',
        services: 'Hizmet Kataloğu',
        stock: 'Stok Durumu',
        finance: 'Finansal Analiz',
        analytics: 'Analitik',
        settings: 'Ayarlar'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'AURA';

    // 4. Background Data Loading (Don't await, let it load in background)
    loadPageData(page);
}

/**
 * Load data specific to the current page
 */
async function loadPageData(page) {
    try {
        switch (page) {
            case 'dashboard':
                await Promise.all([loadStats(), loadRecentAppointments()]);
                break;
            case 'appointments':
                await Promise.all([loadAllAppointments(), updateFormSelects()]);
                break;
            case 'staff':
                await loadAllStaff();
                break;
            case 'services':
                await loadAllServices();
                break;
            case 'stock':
                await loadAllStock();
                break;
        }
    } catch (err) {
        console.error(`Error loading data for ${page}:`, err);
        showToast('Veri güncellenirken bir hata oluştu', 'warning');
    }
}

/* Data Fetchers */
async function loadSalonInfo() {
    try {
        const data = await apiCall('/patron/salon-info');
        if (data.salon) {
            currentSalon = data.salon;
            const el = document.getElementById('salonName');
            if (el) el.textContent = data.salon.name;
        }
    } catch (e) { }
}

async function loadStats() {
    const stats = await apiCall('/patron/stats');
    const update = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    update('todayRevenue', formatCurrency(stats.todayRevenue || 0));
    update('todayAppointments', stats.todayAppointments || 0);
    update('totalStaff', stats.totalStaff || 0);
    update('monthlyRevenue', formatCurrency(stats.monthlyRevenue || 0));
}

async function loadRecentAppointments() {
    const data = await apiCall('/patron/appointments?limit=5');
    renderTable('recentAppointments', data.appointments);
}

async function loadAllAppointments() {
    const data = await apiCall('/patron/appointments');
    renderTable('appointmentsList', data.appointments, true);
}

async function loadAllStaff() {
    const data = await apiCall('/patron/staff');
    const tbody = document.getElementById('staffList');
    if (!tbody) return;
    tbody.innerHTML = data.staff.map(s => `
        <tr>
            <td style="font-weight: 600;">${s.full_name}</td>
            <td>@${s.username}</td>
            <td>${s.phone || '-'}</td>
            <td>%${s.commission_rate}</td>
            <td><span class="badge badge-success">Aktif</span></td>
            <td><button class="btn btn-sm" onclick="deleteItem('staff', ${s.id})" style="color: #f87171;"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

async function loadAllServices() {
    const data = await apiCall('/patron/services');
    const tbody = document.getElementById('servicesList');
    if (!tbody) return;
    tbody.innerHTML = data.services.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.category || '-'}</td>
            <td>${formatCurrency(s.price)}</td>
            <td>${s.duration} dk</td>
            <td><span class="badge badge-success">Aktif</span></td>
            <td><button class="btn btn-sm" onclick="deleteItem('services', ${s.id})" style="color: #f87171;"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

async function loadAllStock() {
    const data = await apiCall('/patron/stock');
    const tbody = document.getElementById('stockList');
    if (!tbody) return;
    tbody.innerHTML = data.stock.map(i => `
        <tr>
            <td>${i.item_name}</td>
            <td>${i.brand || '-'}</td>
            <td>${i.item_type}</td>
            <td style="font-weight: 700; color: ${i.quantity <= 3 ? '#f87171' : '#fff'}">${i.quantity}</td>
            <td>${i.unit}</td>
            <td>${i.low_stock_threshold || 1}</td>
            <td><button class="btn btn-sm" onclick="showToast('İşlem henüz aktif değil')"><i class="fas fa-edit"></i></button></td>
        </tr>
    `).join('');
}

function renderTable(targetId, data, withActions = false) {
    const tbody = document.getElementById(targetId);
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${withActions ? 8 : 6}" style="text-align:center; padding: 2rem; color: #64748b;">Kayıt bulunamadı</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(apt => `
        <tr>
            <td>${formatDate(apt.appointment_date)}</td>
            <td>${apt.appointment_time}</td>
            <td style="font-weight: 500;">${apt.customer_name}</td>
            ${withActions ? `<td>${apt.customer_phone || '-'}</td>` : ''}
            <td>${apt.service_name || '-'}</td>
            <td>${apt.staff_name || '-'}</td>
            <td><span class="badge badge-${getStatusClass(apt.status)}">${apt.status}</span></td>
            ${withActions ? `
                <td>
                    <button onclick="deleteItem('appointments', ${apt.id})" style="color: #f87171; border:none; background:none; cursor:pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            ` : ''}
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    return 'warning';
}

/* Modals */
window.openModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
};
window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
};

/* CRUD Handlers */
async function handleStaffSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
        await apiCall('/patron/staff', { method: 'POST', body: JSON.stringify(data) });
        showToast('Personel eklendi');
        closeModal('staffModal');
        loadAllStaff();
        e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
        await apiCall('/patron/services', { method: 'POST', body: JSON.stringify(data) });
        showToast('Hizmet eklendi');
        closeModal('serviceModal');
        loadAllServices();
        e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
}

async function handleStockSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
        await apiCall('/patron/stock', { method: 'POST', body: JSON.stringify(data) });
        showToast('Ürün eklendi');
        closeModal('stockModal');
        loadAllStock();
        e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
        await apiCall('/patron/appointments/manual', { method: 'POST', body: JSON.stringify(data) });
        showToast('Randevu oluşturuldu');
        closeModal('appointmentModal');
        loadAllAppointments();
        e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
}

window.deleteItem = async (type, id) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
        await apiCall(`/patron/${type}/${id}`, { method: 'DELETE' });
        showToast('Başarıyla silindi');
        const page = window.location.hash.replace('#', '') || 'dashboard';
        loadPageData(page);
    } catch (err) { showToast(err.message, 'error'); }
};

async function updateFormSelects() {
    try {
        const [svc, stf] = await Promise.all([apiCall('/patron/services'), apiCall('/patron/staff')]);
        const sSelect = document.getElementById('serviceSelect');
        const stSelect = document.getElementById('staffSelect');
        if (sSelect) sSelect.innerHTML = svc.services.map(s => `<option value="${s.id}">${s.name} (${s.price} ₺)</option>`).join('');
        if (stSelect) stSelect.innerHTML = stf.staff.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
    } catch (e) { }
}

window.logout = () => {
    UserManager.remove();
    TokenManager.remove();
    window.location.href = '/login.html';
};
