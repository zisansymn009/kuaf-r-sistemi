// Recommendation Service - Akıllı Salon Önerisi
// Ağırlıklı skorlama ile adil dağılım sağlar

/**
 * Salon için öncelik skoru hesaplar
 * @param {Object} salon - Salon objesi
 * @returns {number} - Öncelik skoru
 */
function calculatePriorityScore(salon) {
    const now = new Date();
    const isFeatured = salon.is_featured && salon.featured_until && new Date(salon.featured_until) > now;

    let score = 0;

    // Featured boost (ama çok randevusu varsa azalır)
    if (isFeatured) {
        const appointmentCount = salon.appointment_count || 0;
        const boost = appointmentCount > 50 ? 2 : 3;
        score += boost;
    }

    // Az randevusu olana öncelik (küçük salonları destekle)
    const appointmentPenalty = (salon.appointment_count || 0) * 0.3;
    score -= appointmentPenalty;

    // Kalite önemli
    const rating = salon.rating || 4;
    score += rating * 2;

    // Rastgele faktör (adil dağılım için)
    score += Math.random() * 1.5;

    return Math.max(0, score);
}

/**
 * Ağırlıklı rastgele seçim yapar
 * @param {Array} salons - Salon listesi
 * @returns {Object} - Seçilen salon
 */
function getWeightedRecommendation(salons) {
    if (!salons || salons.length === 0) return null;

    // Her salona skor hesapla
    const scored = salons.map(s => ({
        ...s,
        score: calculatePriorityScore(s)
    }));

    // Toplam skoru hesapla
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0);

    if (totalScore === 0) return scored[0]; // Eğer tüm skorlar 0 ise ilkini döndür

    // Ağırlıklı rastgele seçim
    let random = Math.random() * totalScore;

    for (const salon of scored) {
        random -= salon.score;
        if (random <= 0) {
            return salon;
        }
    }

    // Fallback
    return scored[0];
}

/**
 * Birden fazla salon önerisi al
 * @param {Array} salons - Salon listesi
 * @param {number} count - Öneri sayısı
 * @returns {Array} - Önerilen salonlar
 */
function getMultipleRecommendations(salons, count = 3) {
    if (!salons || salons.length === 0) return [];
    if (salons.length <= count) return salons;

    const recommendations = [];
    const remaining = [...salons];

    for (let i = 0; i < count && remaining.length > 0; i++) {
        const selected = getWeightedRecommendation(remaining);
        recommendations.push(selected);

        // Seçileni listeden çıkar
        const index = remaining.findIndex(s => s.id === selected.id);
        if (index > -1) {
            remaining.splice(index, 1);
        }
    }

    return recommendations;
}

/**
 * Featured limitini kontrol et
 * @param {number} totalSalons - Toplam salon sayısı
 * @param {number} featuredCount - Featured salon sayısı
 * @returns {boolean} - Limit aşılmış mı?
 */
function checkFeaturedLimit(totalSalons, featuredCount) {
    const maxFeaturedPercentage = 0.20; // %20
    const maxFeatured = Math.ceil(totalSalons * maxFeaturedPercentage);
    return featuredCount < maxFeatured;
}

module.exports = {
    calculatePriorityScore,
    getWeightedRecommendation,
    getMultipleRecommendations,
    checkFeaturedLimit
};
