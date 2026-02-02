// Particle System Logic
const canvas = document.getElementById('auraCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        draw() {
            ctx.fillStyle = `rgba(139, 92, 246, ${this.opacity})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 80; i++) particles.push(new Particle());
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }

    window.addEventListener('resize', resize);
    resize();
    initParticles();
    animateParticles();
}

async function sendAuraMessage() {
    const input = document.getElementById('auraInput');
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';

    // Typing indicator
    const typingId = 'typing-' + Date.now();
    appendMessage('ai', '...', typingId);

    try {
        const response = await fetch('/api/ai/public/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();

        document.getElementById(typingId).remove();
        appendMessage('ai', data.response);

        // Advanced: Handle specific intents (Salon booking wizard trigger)
        if (message.toLowerCase().includes('randevu') || message.toLowerCase().includes('salon bul')) {
            setTimeout(() => {
                appendMessage('ai', 'Senin için en iyi seçenekleri hazırlıyorum. Randevu sihirbazını başlatayım mı?');
                // Could automatically jump to booking.html or open a modal here
            }, 1000);
        }
    } catch (error) {
        if (document.getElementById(typingId)) document.getElementById(typingId).remove();
        appendMessage('ai', 'Bağlantı kesildi, frekansları kontrol ediyorum...');
    }
}

function appendMessage(role, text, id = null) {
    const container = document.getElementById('auraMessages');
    const div = document.createElement('div');
    div.className = `chat-bubble bubble-${role}`;
    if (id) div.id = id;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Vision Features
async function openVisionScanner() {
    const modal = document.getElementById('visionModal');
    modal.classList.add('active');

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('cameraPreview').srcObject = mediaStream;
    } catch (error) {
        alert('Kameraya ulaşılamadı. Lütfen izin verin.');
        closeVisionScanner();
    }
}

function closeVisionScanner() {
    const modal = document.getElementById('visionModal');
    modal.classList.remove('active');
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
}

async function startScan() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'scan.jpg');

        closeVisionScanner();
        appendMessage('user', '[Saç Analizi Başlatıldı]');
        appendMessage('ai', 'Görüntü işleniyor, moleküler düzeyde analiz yapıyorum...');

        try {
            const resp = await fetch('/api/ai/vision/analyze', {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            appendMessage('ai', data.analysis);
        } catch (error) {
            appendMessage('ai', 'Analiz sırasında bir enerji dalgalanması oldu, tekrar deneyelim.');
        }
    }, 'image/jpeg');
}

// Load Featured Campaigns
async function loadCampaigns() {
    const container = document.getElementById('campaignGrid');
    try {
        const resp = await fetch('/api/public/campaigns');
        const data = await resp.json();

        if (!data.success || !data.campaigns || data.campaigns.length === 0) {
            container.innerHTML = '<p style="color:#64748b; text-align:center; grid-column: 1 / -1;">Şu an aktif bir kampanya bulunmuyor.</p>';
            return;
        }

        container.innerHTML = data.campaigns.map(c => `
            <div class="campaign-card">
                <div class="campaign-badge">Öne Çıkan</div>
                <div class="campaign-content">
                    <h3 style="color:#fff; margin-bottom:0.1rem;">${c.salon_name}</h3>
                    <h4 style="color:var(--aura-primary); margin-bottom:0.5rem; font-size:1.1rem;">${c.title}</h4>
                    <p style="color:#94a3b8; font-size:0.85rem;">${c.description}</p>
                    <div style="margin-top:1rem; font-weight:bold; color:#ec4899;">İndirim: ${c.discount_rate}</div>
                    <button class="btn-scan" style="font-size:0.8rem; padding:0.5rem 1rem; margin-top:1rem;" onclick="location.href='/login.html'">Randevu Al</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Campaign load error:', e);
        container.innerHTML = '<p>Kampanyalar yüklenemedi.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCampaigns();
    document.getElementById('auraInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAuraMessage();
    });
});
