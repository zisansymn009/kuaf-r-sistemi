
const { query, run, initDatabase } = require('./database/db');

async function seedData() {
    await initDatabase();
    console.log('--- SEEDING ADVANCED SALON DATA ---');

    const salonId = 1; // Default salon for seeding

    // 1. Expansion: Stock Items (Hair & Beauty Focus with Brands)
    const stockItems = [
        ['Oksidan %6 (20 Vol)', 'L\'Oreal', 'oxidant', 5000, 'cl', 0.5],
        ['Oksidan %9 (30 Vol)', 'L\'Oreal', 'oxidant', 5000, 'cl', 0.5],
        ['Majirel No: 5.0', 'L\'Oreal', 'dye', 10, 'adet', 120.0],
        ['Majirel No: 7.1', 'L\'Oreal', 'dye', 10, 'adet', 120.0],
        ['Brezilya Fönü Keratini', 'Inoar', 'care', 1000, 'cl', 2.5],
        ['Saç Botoksu Serumu', 'Selection', 'care', 500, 'cl', 5.0],
        ['Boncuk Ağda (Sarı)', 'Vivet', 'care', 2000, 'gr', 0.15],
        ['Yüz Maskesi (Altın)', 'Casmara', 'care', 20, 'adet', 45.0],
        ['Kaş Vitamini', 'PhiBrows', 'care', 10, 'adet', 150.0]
    ];

    for (const item of stockItems) {
        await run(`
            INSERT OR IGNORE INTO stock (salon_id, item_name, brand, item_type, quantity, unit, unit_cost)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [salonId, ...item]);
    }

    // 2. Expansion: Services (Usage: shampoo, dye, oxidant, general)
    const services = [
        ['Ombre / Balyaj Paketi', 'Profesyonel renk açma ve tonlama işlemi.', 1800.0, 180, 'Saç', 15, 60, 100, 0],
        ['Brezilya Fönü', 'Kalıcı fön ve keratin bakımı.', 1200.0, 120, 'Saç', 10, 0, 0, 50],
        ['Microblading (Kıl Tekniği)', 'Doğal görünümlü kaş tasarımı.', 2500.0, 150, 'Makyaj', 0, 0, 0, 1],
        ['İpek Kirpik', 'Tekli kirpik ekleme uygulaması.', 600.0, 90, 'Güzellik', 0, 0, 0, 1],
        ['Dermapen Cilt Bakımı', 'Derinlemesine cilt yenileme.', 850.0, 60, 'Güzellik', 5, 0, 0, 10]
    ];

    for (const s of services) {
        await run(`
            INSERT OR IGNORE INTO services (salon_id, name, description, price, duration, category, shampoo_usage, dye_usage, oxidant_usage, general_usage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [salonId, ...s]);
    }

    console.log('✅ SEEDING COMPLETE');
}

seedData();
