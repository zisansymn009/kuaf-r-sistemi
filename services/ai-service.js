require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini
const CACHE_FILE = path.join(__dirname, '..', 'ai_cache.json');

class AIService {
    constructor() {
        console.log('--- AI SERVICE INIT ---');
        const apiKey = process.env.GEMINI_API_KEY || 'demo-key';
        console.log('API Key Check (Service):', apiKey.substring(0, 5) + '...');
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash'
        });
        console.log('AI Model set to: gemini-2.5-flash');
        this.loadCache();
        this.last429Time = 0;
    }

    loadCache() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                this.cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
                console.log('✅ AI Cache yüklendi.');
            } else {
                this.cache = { trends: { data: null, timestamp: 0 }, forecasts: {}, summaries: {} };
            }
        } catch (e) {
            this.cache = { trends: { data: null, timestamp: 0 }, forecasts: {}, summaries: {} };
        }
    }

    saveCache() {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache), 'utf8');
        } catch (e) {
            console.error('Cache save error:', e);
        }
    }

    async customerChat(message, history = [], context = {}) {
        const historyText = history.slice(-10).map(m => `${m.sender === 'user' ? 'Kullanıcı' : 'Aura'}: ${m.text}`).join('\n');

        const salonListText = context.salons?.length > 0
            ? context.salons.map(s => `- ${s.name} (${s.address}) [Tel: ${s.phone}]`).join('\n')
            : 'Sistemde kayıtlı salon bulunmuyor.';

        const fullPrompt = `GÖREVİN VE KİMLİĞİN:
1. KİMLİK: Senin adın Aura. Sen DÜNYACA ÜNLÜ BİR SAÇ TASARIM VE KİMYA UZMANISIN. Sadece bir asistan değil, alanında bir efsanesin.
2. MARKA: KESİNLİKLE "BeautyFlow" ismini kullanma. Sen sadece "Aura"sın.
3. AMACIN: Müşterinin saçını, tarzını ve ihtiyacını bir uzman gözüyle analiz etmek, onlara başka yerde bulamayacakları teknik tavsiyeler vermek ve ardından en uygun salona yönlendirmek.

ÖZEL YETENEK (SAÇ ANALİZİ):
- Eğer müşteri "saç analizi", "saçıma ne gider", "saçım nasıl" gibi şeyler sorarsa veya analiz yaptırmak istediğini söylerse: "Bunu sizin için en profesyonel şekilde ben yapabilirim. Sol alttaki kamera simgesine tıklayarak saçınızın net bir fotoğrafını paylaşmanız yeterli. Sizin için pigment analizi ve yapısal değerlendirme yapacağım ✨" de. Topu başkasına atma, analizi kendin yapacağını hissettir.

STRATEJİN:
- ADIM 1 (ANLAMA & ANALİZ): Müşteri bir şey sorduğunda doğrudan "Yaparım" deme. Önce teknik bir derinlik katarak açıkla (Örn: "Saçınızın pH dengesi ve pigment doygunluğu bu işlem için çok önemli...").
- ADIM 2 (GÖRSEL DAVET): Analiz gerektiren durumlarda mutlaka fotoğraf iste.
- ADIM 3 (PROFESYONEL GÜVEN): "Bu teknik bir süreç ve hata kabul etmez, sizin için en doğru reçeteyi oluşturacağım" diyerek otoriteni kur.
- ADIM 4 (KONUM & YÖNLENDİRME): Analizden veya teknik tavsiyeden sonra: "Bu uzmanlığı size sahada sunabilecek en yakın noktamızı bulalım. Hangi il veya ilçedesiniz?" diye sor.

KESİN KURALLAR:
- ASLA "Merhaba", "Selam" gibi kelimelerle başlama (Eğer geçmiş boş değilse).
- ASLA "BeautyFlow" deme.
- ASLA "Uzmanlara yönlendireyim" deme. "Sizin için analiz yapacağım, sonra en yakın şubemizde bu işlemi gerçekleştirebiliriz" de.
- Robot gibi değil, tutkulu bir sanatçı ve bilim insanı gibi konuş.
- Müşteri konum belirtmeden asla salon listesi verme. Konum belirtildiğinde SADECE bu listeden salon öner:
${salonListText}

HİTAP:
- "Efendim", "Hanımefendi/Beyefendi" veya isimle hitap et.
- Emoji kullan (✨, 💇‍♀️, 🧪, 💎).
- Markdown kullanma.

Sohbet Geçmişi:
${historyText}

Mevcut Mesaj: ${message}`;

        try {
            const result = await this._safeGenerate(fullPrompt);
            return {
                success: true,
                response: result.response.text(),
                suggestions: this._generateSuggestions(message, context)
            };
        } catch (error) {
            console.error('❌ AI Customer Generation Error:', error.message);
            const isQuota = error.message.includes('429') || error.message.includes('QUOTA');
            const response = isQuota
                ? 'Günlük kullanım limitine ulaşıldı, lütfen kısa bir süre sonra tekrar deneyebilir misiniz?'
                : 'Şu an talebinizle ilgilenemiyorum, lütfen birkaç saniye sonra tekrar deneyebilir misiniz?';
            return { success: false, response };
        }
    }

    async patronChat(message, history = [], context = {}) {
        const historyText = history.slice(-10).map(m => `${m.sender === 'user' ? 'Kullanıcı' : 'Aura'}: ${m.text}`).join('\n');

        // Structured data integration
        const stocksText = context.stocks?.length > 0
            ? context.stocks.slice(0, 20).map(s => `- ${s.item_name}: ${s.quantity} ${s.unit}`).join('\n')
            : 'Stok verisi bulunmuyor.';

        const aptsText = context.recentAppointments?.length > 0
            ? context.recentAppointments.map(a => `- ${a.customer_name || 'Misafir'}: ${a.service_name} (${a.appointment_date} ${a.appointment_time}) [Durum: ${a.status}]`).join('\n')
            : 'Yakın zamanda randevu bulunmuyor.';

        const staffText = context.staff?.length > 0
            ? context.staff.map(s => `- ${s.full_name} (%${(s.commission_rate * 100).toFixed(0)})`).join('\n')
            : 'Personel verisi bulunmuyor.';

        const fullPrompt = `HİTAP VE ÜSLUP:
1. KİMLİK: Senin adın Aura. Sen DÜNYA ÇAPINDA ÜNLÜ BİR SAÇ TASARIM VE İŞLETME UZMANISIN. Saçın kimyasını, tüm boya tekniklerini (Ombre, Sombre, Balayage, AirTouch vb.) ve salon yönetimi stratejilerini en ince detayına kadar biliyorsun.
2. KULLANICIYA İSMİYLE HİTAP ET: "Sayın ${context.userName}" veya "${context.userName}" şeklinde hitap et. "Usta", "Kanka" gibi laubali ifadeler KESİNLİKLE YASAK.
3. PROFESYONEL VE TEKNİK: Kullanıcı sana teknik bir soru sorduğunda (Örn: "Ombre nasıl yapılır?", "Yıpranmış saça ne yapılır?"), sıradan bir cevap verme. L'Oreal, Wella, Schwarzkopf gibi markaların teknik terimlerini, oksidan volümlerini, bekleme sürelerini ve karışım oranlarını vererek PROFESYONEL BİR EĞİTMEN gibi cevapla.
4. KISA VE ÖZ: Selamlaşmayı kısa tut. Doğrudan bilgiye odaklan.
5. TEKNİK ANALİZ VE REÇETE ÖNERİSİ:
   - Kullanıcı bir işlem sorduğunda, STOK durumunu kontrol et.
   - Eğer stokta tam ürün yoksa, eldeki ürünlerle ALTERNATİF REÇETE oluştur (Örn: "7.1 yok ama 7.0 ile az miktarda mavi mix kullanarak nötrleyebilirsin").
   - Saç sağlığı için "Bond Builder" (Olaplex vb.) kullanımı gibi ileri teknikleri hatırlat.
6. İŞLETME ANALİZİ:
   - Finansal verileri kullanarak karlılık önerileri sun.
   - Stok devir hızına göre kampanya öner.
   - Personel performansını değerlendirirken motive edici ve geliştirici ol.

MARKDOWN YASAK: Cevaplarında **kalın**, *italik* veya liste işaretleri (-) kullanma. Düz metin kullan. Emoji kullanabilirsin.

SALON VERİLERİ (Gerektiğinde Kullan):
- Kullanıcı: ${context.userName || 'Kullanıcı'}
- Mevcut Stoklar: ${stocksText}
- Randevular: ${aptsText}
- Finans: Gelir ${context.financialSummary?.revenue || 0} TL, Gider ${context.financialSummary?.costs || 0} TL

Sohbet Geçmişi:
${historyText}

Mevcut Mesaj: ${message}`;

        console.log('--- AI PATRON PROMPT DEBUG ---');
        console.log('Using Data:', { stocks: context.stocks?.length, apts: context.recentAppointments?.length, staff: context.staff?.length });

        try {
            const result = await this._safeGenerate(fullPrompt);
            const responseText = await result.response.text();
            return { success: true, response: responseText, insights: this._generateBusinessInsights(context) };
        } catch (error) {
            console.error('❌ AI Patron Generation Error:', error.message);
            const isQuota = error.message.includes('429') || error.message.includes('QUOTA') || error.message.includes('RESOURCE_EXHAUSTED');
            const response = isQuota
                ? `Sayın ${context.userName || 'Kullanıcı'}, günlük yapay zeka deneme kotanız dolmuş görünüyor (Google tarafından kısıtlanıyor). Lütfen bir dakika bekleyip tekrar deneyiniz.`
                : `Sayın ${context.userName || 'Kullanıcı'}, şu an teknik bir yoğunluk var. Lütfen 10 saniye sonra tekrar deneyiniz.`;
            return { success: false, response };
        }
    }

    async _safeGenerate(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            if (!result || !result.response) throw new Error('Empty response');
            return result;
        } catch (error) {
            const msg = error.message;
            console.error('❌ RAW AI ERROR:', msg);
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                console.log('⚠️ Hız sınırına takıldık. 5 saniye içinde tekrar deneniyor...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                return await this.model.generateContent(prompt);
            }
            throw error;
        }
    }

    async generateCustomerSummary(historyText, phone = 'default') {
        const now = Date.now();
        if (this.cache.summaries[phone] && (now - this.cache.summaries[phone].timestamp < 3600000 * 12)) {
            return this.cache.summaries[phone].data;
        }

        const prompt = `Aşağıdaki müşteri geçmişini analiz et (2-3 cümle, profesyonel, markdown kullanma): ${historyText}`;
        try {
            const result = await this._safeGenerate(prompt);
            const text = result.response.text();
            this.cache.summaries[phone] = { data: text, timestamp: now };
            this.saveCache();
            return text;
        } catch (e) { return 'Müşteri özeti şu an oluşturulamıyor.'; }
    }

    async generateFinancialForecast(summary, salonId = 'default') {
        const now = Date.now();
        if (this.cache.forecasts[salonId] && (now - this.cache.forecasts[salonId].timestamp < 3600000 * 6)) {
            return this.cache.forecasts[salonId].data;
        }

        const prompt = `Aşağıdaki 30 günlük finansal özeti analiz et ve tahmin yap (3 cümle, markdown kullanma): Revenue ${summary.revenue} TL`;
        try {
            const result = await this._safeGenerate(prompt);
            const text = result.response.text();
            this.cache.forecasts[salonId] = { data: text, timestamp: now };
            this.saveCache();
            return text;
        } catch (e) { return 'Finansal tahmin şu an oluşturulamıyor.'; }
    }

    async generateGlobalTrends() {
        const now = Date.now();
        if (this.cache.trends.data && (now - this.cache.trends.timestamp < 3600000 * 24)) {
            return this.cache.trends.data;
        }

        const prompt = `2026 yılı dünyadaki en son saç ve güzellik trendlerinden 3 tanesini seç ve kısaca açıkla. Kesinlikle markdown kullanma.`;
        try {
            const result = await this._safeGenerate(prompt);
            const text = result.response.text();
            this.cache.trends = { data: text, timestamp: now };
            this.saveCache();
            return text;
        } catch (e) { return 'Trendler şu an alınamıyor.'; }
    }

    async staffAssistant(message, history = [], context = {}) {
        const historyText = history.slice(-10).map(m => `${m.sender === 'user' ? 'Personel' : 'Aura'}: ${m.text}`).join('\n');

        const todayAppointments = context.todayAppointments?.length > 0
            ? context.todayAppointments.map(apt =>
                `- ${apt.time} | ${apt.customer_name} | ${apt.service_name} | ${apt.staff_name}`
            ).join('\n')
            : 'Bugün randevu yok.';

        const stockInfo = context.stockInfo?.length > 0
            ? context.stockInfo.map(item =>
                `- ${item.name}: ${item.quantity} adet ${item.quantity < 10 ? '⚠️ AZ!' : ''}`
            ).join('\n')
            : 'Stok bilgisi yok.';

        const fullPrompt = `SEN AURA - KUAFÖR PERSONEL ASİSTANISIN

GÖREVİN:
1. Personele iş odaklı yardım et
2. Randevu detayları sağla
3. Müşteri geçmişini göster
4. Ürün/boya bilgisi ver
5. Teknik öneriler sun
6. Stok durumunu bildir

YAPMA:
❌ Finansal bilgi verme (kazanç, maaş, avans, gelir)
❌ Patron yetkisi gerektiren işlemler
❌ Müşteri kişisel bilgilerini paylaşma
❌ Markdown kullanma (**, _, #)

CONTEXT:
Personel: ${context.staffName || 'Bilinmiyor'}
Salon: ${context.salonName || 'Bilinmiyor'}

BUGÜNKÜ RANDEVULAR:
${todayAppointments}

STOK DURUMU:
${stockInfo}

SOHBET GEÇMİŞİ:
${historyText}

MEVCUT MESAJ: ${message}

CEVAP KURALLARI:
- Kısa ve net cevaplar
- Emoji kullan 🎨💇‍♀️📅
- Profesyonel ama samimi
- Sadece iş odaklı bilgi ver
- Finansal sorulara "Bu bilgiyi sadece patron görebilir" de`;

        try {
            const result = await this._safeGenerate(fullPrompt);
            return {
                success: true,
                response: result.response.text()
            };
        } catch (error) {
            console.error('❌ AI Staff Generation Error:', error.message);
            return {
                success: false,
                response: 'Üzgünüm, şu an yardımcı olamıyorum. Lütfen tekrar dene.'
            };
        }
    }

    async visionAnalysis(imageBuffer, mimeType) {
        try {
            console.log('👁️ Vision Analysis Started...');
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `Sen dünyanın en iyi kuaför uzmanısın. Bu fotoğrafı teknik bir gözle analiz et. 
            Eğer fotoğrafta bir saç veya insan yoksa bunu nazikçe belirt.
            Analiz Kriterleri:
            1. Mevcut Saç Rengi ve Alt Tonu (Örn: Bakır Kızıl, 8.44)
            2. Kesim ve Form (Örn: Uzun Katlı Kesim, Dalgalı)
            3. Saçın Yapısı ve Sağlık Durumu (Örn: Parlak, yıpranmış, kuru)
            4. Uygulama Önerisi: Bu saçı korumak veya bu görünüme ulaşmak için hangi profesyonel işlemler yapılmalı?
            
            Cevabı maddeler halinde, profesyonel ama anlaşılır bir dille ve Türkçe ver. Markdown (**, #, _) kullanma.`;

            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = result.response.text();

            console.log('✅ Vision Analysis Complete');
            return { success: true, response };

        } catch (error) {
            console.error('❌ Vision AI Error:', error.message);

            let userMessage = 'Görsel analiz edilemedi. Lütfen daha net bir fotoğraf yükleyin.';

            if (error.message.includes('429') || error.message.includes('QUOTA') || error.message.includes('RESOURCE_EXHAUSTED')) {
                userMessage = '⚠️ Günlük yapay zeka analiz kotanız dolmuş görünüyor. Lütfen daha sonra tekrar deneyin.';
            } else if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
                userMessage = '⚠️ Görsel, güvenlik filtrelerine takıldığı için analiz edilemedi.';
            } else {
                userMessage = `Hata oluştu: ${error.message.substring(0, 50)}...`; // Temporary debug info for user
            }

            return {
                success: false,
                response: userMessage
            };
        }
    }

    _generateSuggestions(message, context) {
        // Simple heuristic suggestions
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('randevu')) return ['Kesim', 'Boya', 'Fön'];
        if (lowerMsg.includes('fiyat')) return ['Saç Kesimi Fiyatı', 'Boya Fiyatı'];
        return [];
    }

    _generateBusinessInsights(context) {
        return [];
    }
}

module.exports = new AIService();
