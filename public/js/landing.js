// BeautyFlow Landing Page - Guest Reservation System
// API_BASE is already defined in utils.js

let currentStep = 1;
let bookingData = {
    salonId: null,
    salonName: '',
    serviceId: null,
    serviceName: '',
    servicePrice: 0,
    staffId: null,
    staffName: '',
    appointmentDate: '',
    appointmentTime: '',
    customerName: '',
    customerPhone: ''
};

// Load salons and locations on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Landing page loaded, fetching locations...');
    loadLocations(); // İlleri yükle
    loadSalons();    // Başlangıçta tüm salonları yükle
    setupEventListeners();
});

function setupEventListeners() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (submitBtn) submitBtn.addEventListener('click', submitBooking);

    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.addEventListener('change', loadAvailability);
    }

    // Phone formatting
    const phoneInput = document.getElementById('customerPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneInput);
    }
}

// Dynamics Locations (Only where salons exist)
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE}/public/locations`);
        const data = await response.json();
        const citySelect = document.getElementById('citySelect');

        if (data.success && citySelect) {
            data.cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Konum yükleme hatası:', error);
    }
}

async function handleCityChange() {
    const city = document.getElementById('citySelect').value;
    const districtSelect = document.getElementById('districtSelect');

    // Reset district
    districtSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';

    if (!city) {
        loadSalons(); // İl seçimi kalktıysa tümünü yükle
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/public/locations?city=${city}`);
        const data = await response.json();

        if (data.success) {
            data.districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
        loadSalonsByLocation(); // Filtreli yükle
    } catch (error) {
        console.error('İlçe yükleme hatası:', error);
    }
}

async function loadSalonsByLocation() {
    const city = document.getElementById('citySelect').value;
    const district = document.getElementById('districtSelect').value;
    loadSalons(city, district);
}

// Load active salons (with filtering)
async function loadSalons(city = '', district = '') {
    const salonList = document.getElementById('salonList');
    if (!salonList) return;

    salonList.innerHTML = '<p class="text-muted">Salonlar yükleniyor...</p>';

    try {
        let url = `${API_BASE}/public/salons`;
        const params = new URLSearchParams();
        if (city) params.append('city', city);
        if (district) params.append('district', district);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.salons || data.salons.length === 0) {
            salonList.innerHTML = '<p class="text-muted">Aranan bölgede aktif salon bulunmuyor</p>';
            return;
        }

        salonList.innerHTML = data.salons.map(salon => `
            <div class="salon-card" onclick="selectSalon(${salon.id}, '${salon.name}')" data-id="${salon.id}">
                <h4>${salon.name}</h4>
                <p class="text-muted"><i class="fas fa-location-dot"></i> ${salon.district || ''}, ${salon.city || ''}</p>
                <p class="text-muted" style="font-size: 0.8rem;">${salon.address || ''}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Salon yükleme hatası:', error);
        salonList.innerHTML = '<p class="text-muted" style="color: var(--danger);">Salonlar yüklenemedi</p>';
    }
}

// Select salon
function selectSalon(id, name) {
    bookingData.salonId = id;
    bookingData.salonName = name;

    document.querySelectorAll('.salon-card').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.querySelector(`.salon-card[data-id="${id}"]`);
    if (selectedCard) selectedCard.classList.add('selected');

    loadServices(id);
}

// Load services for selected salon
async function loadServices(salonId) {
    const serviceList = document.getElementById('serviceList');
    if (!serviceList) return;

    serviceList.innerHTML = '<p class="text-muted">Hizmetler yükleniyor...</p>';

    try {
        const response = await fetch(`${API_BASE}/public/salons/${salonId}/services`);
        const data = await response.json();

        if (!data.services || data.services.length === 0) {
            serviceList.innerHTML = '<p class="text-muted">Bu salonda henüz hizmet bulunmuyor</p>';
            return;
        }

        serviceList.innerHTML = data.services.map(service => `
            <div class="service-card" onclick="selectService(${service.id}, '${service.name}', ${service.price})" data-id="${service.id}">
                ${service.before_image ? `<img src="${service.before_image}" alt="Sample" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">` : ''}
                <h4>${service.name}</h4>
                <p class="text-muted">${service.category || 'Genel'}</p>
                <p style="color: var(--aura-primary); font-weight: 700;">${formatCurrency(service.price)}</p>
                <p class="text-muted" style="font-size: 0.8rem;"><i class="far fa-clock"></i> ${formatDuration(service.duration)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Hizmet yükleme hatası:', error);
        serviceList.innerHTML = '<p class="text-muted">Hizmetler yüklenemedi</p>';
    }
}

// Select service
function selectService(id, name, price) {
    bookingData.serviceId = id;
    bookingData.serviceName = name;
    bookingData.servicePrice = price;

    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
    const selectedCard = document.querySelector(`.service-card[data-id="${id}"]`);
    if (selectedCard) selectedCard.classList.add('selected');

    loadStaff();
}

// Load staff for selected salon
async function loadStaff() {
    try {
        const response = await fetch(`${API_BASE}/public/salons/${bookingData.salonId}/staff`);
        const data = await response.json();
        bookingData.staffList = data.staff;
    } catch (error) {
        console.error('Personel yükleme hatası:', error);
    }
}

// Load availability when date is selected
async function loadAvailability() {
    const dateInput = document.getElementById('appointmentDate');
    const date = dateInput ? dateInput.value : '';
    if (!date) return;

    bookingData.appointmentDate = date;

    const availabilityList = document.getElementById('availabilityList');
    if (!availabilityList) return;

    availabilityList.innerHTML = '<p class="text-muted">Müsait saatler yükleniyor...</p>';

    try {
        const response = await fetch(`${API_BASE}/public/available-slots?salonId=${bookingData.salonId}&serviceId=${bookingData.serviceId}&date=${date}`);
        const data = await response.json();

        if (!data.availability || data.availability.length === 0) {
            availabilityList.innerHTML = '<p class="text-muted">Bu tarihte müsait personel yok</p>';
            return;
        }

        availabilityList.innerHTML = data.availability.map(staff => `
            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 1rem; font-size: 1rem;">${staff.staffName}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem;">
                    ${staff.availableSlots.map(slot => `
                        <div class="time-slot" onclick="selectTimeSlot(${staff.staffId}, '${staff.staffName}', '${slot}')" data-time="${slot}">
                            ${slot}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Müsaitlik yükleme hatası:', error);
        availabilityList.innerHTML = '<p class="text-danger">Bağlantı hatası</p>';
    }
}

// Select time slot
function selectTimeSlot(staffId, staffName, time) {
    bookingData.staffId = staffId;
    bookingData.staffName = staffName;
    bookingData.appointmentTime = time;

    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    event.target.classList.add('selected');
}

// Navigation
function nextStep() {
    if (!validateStep(currentStep)) return;

    if (currentStep < 4) {
        currentStep++;
        updateWizard();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateWizard();
    }
}

function validateStep(step) {
    switch (step) {
        case 1:
            if (!bookingData.salonId) {
                alert('Lütfen bir salon seçin');
                return false;
            }
            break;
        case 2:
            if (!bookingData.serviceId) {
                alert('Lütfen bir hizmet seçin');
                return false;
            }
            break;
        case 3:
            if (!bookingData.appointmentDate || !bookingData.appointmentTime) {
                alert('Lütfen tarih ve saat seçin');
                return false;
            }
            break;
    }
    return true;
}

function updateWizard() {
    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach((stepEl) => {
        const step = parseInt(stepEl.dataset.step);
        stepEl.classList.remove('active', 'completed');
        if (step < currentStep) {
            stepEl.classList.add('completed');
        } else if (step === currentStep) {
            stepEl.classList.add('active');
        }
    });

    // Update panels
    document.querySelectorAll('.wizard-panel').forEach((panel, index) => {
        panel.classList.toggle('hidden', index + 1 !== currentStep);
    });

    // Update buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.classList.toggle('hidden', currentStep === 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === 4);
    if (submitBtn) submitBtn.classList.toggle('hidden', currentStep !== 4);

    // Update summary on last step
    if (currentStep === 4) {
        updateSummary();
    }
}

function updateSummary() {
    const summary = document.getElementById('bookingSummary');
    if (!summary) return;

    summary.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
                <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">Salon</p>
                <p style="font-weight: 600;">${bookingData.salonName}</p>
            </div>
            <div>
                <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">Hizmet</p>
                <p style="font-weight: 600;">${bookingData.serviceName} (${formatCurrency(bookingData.servicePrice)})</p>
            </div>
            <div>
                <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">Personel</p>
                <p style="font-weight: 600;">${bookingData.staffName}</p>
            </div>
            <div>
                <p style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">Zaman</p>
                <p style="font-weight: 600;">${formatDate(bookingData.appointmentDate)} @ ${bookingData.appointmentTime}</p>
            </div>
        </div>
    `;
}

// Submit booking
async function submitBooking() {
    bookingData.customerName = document.getElementById('customerName').value.trim();
    bookingData.customerPhone = document.getElementById('customerPhone').value.trim();

    if (!bookingData.customerName || !bookingData.customerPhone) {
        showToast('Lütfen ad soyad ve telefon bilgilerinizi girin', 'warning');
        return;
    }

    // Validate phone format
    if (!validatePhone(bookingData.customerPhone)) {
        showToast('Geçerli bir telefon numarası girin (05XX XXX XX XX)', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/public/book-appointment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                salonId: bookingData.salonId,
                serviceId: bookingData.serviceId,
                staffId: bookingData.staffId,
                customerName: bookingData.customerName,
                customerPhone: bookingData.customerPhone,
                appointmentDate: bookingData.appointmentDate,
                appointmentTime: bookingData.appointmentTime
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Randevu oluşturulamadı');
        }

        showToast(data.message || 'Randevunuz başarıyla oluşturuldu!', 'success');

        // Reset and go back to step 1
        setTimeout(() => {
            location.reload();
        }, 2000);
    } catch (error) {
        console.error('Randevu oluşturma hatası:', error);
        showToast(error.message, 'error');
    }
}

// Phone validation
function validatePhone(phone) {
    const cleaned = phone.replace(/\s/g, '');
    const phoneRegex = /^(05)([0-9]{2})([0-9]{3})([0-9]{2})([0-9]{2})$/;
    return phoneRegex.test(cleaned);
}

// Phone input formatting
function formatPhoneInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 7) {
        e.target.value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7, 9) + ' ' + value.slice(9);
    } else if (value.length > 4) {
        e.target.value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7);
    } else {
        e.target.value = value;
    }
}

// Image modal
function showImageModal(beforeImage, afterImage) {
    const modal = document.getElementById('imageModal');
    const beforeImg = document.getElementById('modalBeforeImage');
    const afterImg = document.getElementById('modalAfterImage');
    const afterContainer = document.getElementById('modalAfterContainer');

    beforeImg.src = beforeImage;

    if (afterImage) {
        afterImg.src = afterImage;
        afterContainer.style.display = 'block';
    } else {
        afterContainer.style.display = 'none';
    }

    modal.classList.remove('hidden');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}
