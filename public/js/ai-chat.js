// Kuaför Aura AI Chat Widget
// Universal chat component for both customer and patron use

class AIChat {
    constructor(config) {
        this.isPatron = config.isPatron || false;

        // Re-calculate isPatron more robustly
        this._checkContext();

        // Fallback for API_BASE if not defined
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : (window.location.origin + '/api');

        this.apiEndpoint = this.isPatron ? `${apiBase}/ai/patron/chat` : `${apiBase}/ai/public/chat`;
        this.sessionId = this._generateSessionId();
        this.isOpen = false;
        this.messages = []; // Internal history for UI and context

        if (window.aiChat) return window.aiChat;
        window.aiChat = this;

        console.log('--- AI Chat Client Init ---');
        console.log('Context:', this.isPatron ? 'PATRON' : 'PUBLIC');
        console.log('Endpoint:', this.apiEndpoint);

        this.init();
    }

    _checkContext() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/patron/') || path.includes('/staff/') || path.includes('/superadmin/')) {
            this.isPatron = true;
        } else {
            this.isPatron = false;
        }
    }

    init() {
        this._createChatWidget();
        this._attachEventListeners();
    }

    _generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _createChatWidget() {
        const widget = document.createElement('div');
        widget.id = 'ai-chat-widget';
        widget.innerHTML = `
            <style>
                #ai-chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                }

                .ai-chat-button {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b5cf6 0%, #fbbf24 100%);
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .ai-chat-button:hover {
                    transform: scale(1.1) rotate(5deg);
                }

                .ai-chat-button svg {
                    width: 28px;
                    height: 28px;
                    fill: white;
                }

                .ai-chat-window {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 360px;
                    height: 550px;
                    background: #0f172a;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    animation: aura-slide-up 0.4s ease-out;
                }

                @keyframes aura-slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .ai-chat-window.open {
                    display: flex;
                }

                .ai-chat-header {
                    padding: 1.25rem;
                    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .ai-chat-header h3 {
                    margin: 0;
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .ai-chat-header .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #10b981;
                }

                .ai-chat-close {
                    color: #94a3b8;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .ai-chat-close:hover { color: #fff; }

                .ai-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,0.1) transparent;
                }

                .ai-chat-messages::-webkit-scrollbar { width: 5px; }
                .ai-chat-messages::-webkit-scrollbar-thumb { 
                    background: rgba(255,255,255,0.1); 
                    border-radius: 10px;
                }

                .ai-message {
                    max-width: 85%;
                    padding: 0.85rem 1rem;
                    border-radius: 16px;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    position: relative;
                }

                .ai-message.ai {
                    background: rgba(255, 255, 255, 0.05);
                    color: #e2e8f0;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .ai-message.user {
                    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                }

                .ai-chat-typing {
                    display: none;
                    align-self: flex-start;
                    padding: 0.85rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 16px;
                    border-bottom-left-radius: 4px;
                }

                .ai-chat-typing.active { display: flex; gap: 4px; }
                
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: aura-typing 1.4s infinite ease-in-out;
                }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes aura-typing {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1.2); opacity: 1; }
                }

                .ai-chat-input-area {
                    padding: 1.25rem;
                    background: #1e293b;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }

                .ai-chat-input-wrapper {
                    display: flex;
                    gap: 8px;
                    background: #0f172a;
                    padding: 4px 4px 4px 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: border-color 0.3s;
                }

                .ai-chat-input-wrapper:focus-within {
                    border-color: #8b5cf6;
                }

                .ai-chat-input-wrapper input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 0.95rem;
                    padding: 8px 0;
                }

                .ai-chat-input-wrapper input:focus { outline: none; }

                .ai-chat-send-btn {
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .ai-chat-send-btn:hover { background: #7c3aed; }
                .ai-chat-send-btn svg { width: 18px; height: 18px; fill: white; }
            </style>

            <button class="ai-chat-button" id="ai-chat-toggle">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12c0 1.91.54 3.68 1.46 5.19L2 22l4.81-1.46C8.32 21.46 10.09 22 12 22c5.53 0 10-4.47 10-10S17.53 2 12 2zm0 18c-1.65 0-3.2-.44-4.54-1.21l-3.13.95.95-3.13C4.44 15.27 4 13.72 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
            </button>

            <div class="ai-chat-window" id="ai-chat-window">
                <div class="ai-chat-header">
                    <h3><span class="status-dot"></span> ${this.isPatron ? 'Aura Master' : 'Aura'}</h3>
                    <button class="ai-chat-close" id="ai-chat-close">&times;</button>
                </div>
                <div class="ai-chat-messages" id="ai-chat-messages">
                    <div class="ai-message ai">
                        ${this.isPatron
                ? 'Merhaba! Ben Aura. Salonunuzun stokları, finansal durumu ve teknik operasyonları için size yardımcı olmaya hazırım. Ne yapalım?'
                : 'Merhaba! Ben Aura. Size nasıl yardımcı olabilirim?'}
                    </div>
                </div>
                <!-- Typing indicator stays outside messages for easy insertBefore -->
                <div class="ai-chat-typing" id="ai-chat-typing" style="margin: 0 1.25rem 1rem 1.25rem;">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <div class="ai-chat-input-area">
                    <div class="ai-chat-input-wrapper">
                        <input type="text" id="ai-chat-input" placeholder="Bir şey sor..." autocomplete="off">
                        <button class="ai-chat-send-btn" id="ai-chat-send">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);
    }

    _attachEventListeners() {
        document.getElementById('ai-chat-toggle').addEventListener('click', () => this.toggle());
        document.getElementById('ai-chat-close').addEventListener('click', () => this.close());
        document.getElementById('ai-chat-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('ai-chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const win = document.getElementById('ai-chat-window');
        win.classList.toggle('open', this.isOpen);
        if (this.isOpen) {
            document.getElementById('ai-chat-input').focus();
            this._scrollToBottom();
        }
    }

    close() {
        this.isOpen = false;
        document.getElementById('ai-chat-window').classList.remove('open');
    }

    async sendMessage() {
        const input = document.getElementById('ai-chat-input');
        const text = input.value.trim();
        if (!text) return;

        // 1. Capture history BEFORE adding the new message (for AI context)
        const historyForAI = [...this.messages];

        // 2. Add to UI (this internally pushes to this.messages)
        this._addMessage(text, 'user');
        input.value = '';

        // 3. Show typing
        const typing = document.getElementById('ai-chat-typing');
        if (typing) {
            typing.classList.add('active');
            this._scrollToBottom();
        }

        try {
            const token = typeof TokenManager !== 'undefined' ? TokenManager.get() : null;
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.isPatron && token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: this.sessionId,
                    history: historyForAI.slice(-10)
                })
            });

            const data = await response.json();
            if (typing) typing.classList.remove('active');

            if (data.success) {
                this._addMessage(data.response, 'ai');
            } else {
                const errMsg = data.error || data.details || data.response || 'Yapay zeka şu an talebinizi işleyemiyor.';
                this._addMessage(errMsg, 'ai');
                console.error('❌ AI API Error:', data);
                if (typeof showToast !== 'undefined') showToast(errMsg, 'error');
            }
        } catch (err) {
            console.error('❌ AI Fetch Error:', err);
            if (typing) typing.classList.remove('active');
            this._addMessage('Bağlantı hatası oluştu, lütfen internet bağlantınızı kontrol ediniz.', 'ai');
        }
    }

    _addMessage(text, sender) {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `ai-message ${sender}`;
        div.textContent = text;
        container.appendChild(div);

        // Push to internal history
        this.messages.push({ sender, text, timestamp: new Date() });

        this._scrollToBottom();
    }

    _scrollToBottom() {
        const container = document.getElementById('ai-chat-messages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 50);
    }
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.aiChat) {
            window.aiChat = new AIChat({});
        }
    });
} else {
    if (!window.aiChat) {
        window.aiChat = new AIChat({});
    }
}
