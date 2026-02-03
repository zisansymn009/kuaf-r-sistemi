const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database dosya yolu (SQLite için)
const DB_PATH = path.join(__dirname, '..', 'beautyflow.db');
const SCHEMA_PATH_SQLITE = path.join(__dirname, 'schema.sql');
const SCHEMA_PATH_PG = path.join(__dirname, 'schema.pg.sql');

// Bağlantı durumu
let dbType = 'sqlite'; // 'sqlite' or 'postgres'
let sqliteDb;
let pgPool;

// SQL Helper: SQLite (?) parametrelerini PG ($1, $2) formatına çevirir
function convertToPgSql(sql) {
    let i = 1;
    let converted = sql.replace(/\?/g, () => `$${i++}`); // Replace all ? with $1, $2, etc.

    // INSERT sorgularında ID geri döndürmek için (SQLite'daki lastID karşılığı)
    if (converted.trim().toUpperCase().startsWith('INSERT') && !converted.toUpperCase().includes('RETURNING')) {
        // Basit bir RETURNING id eklemesi (genelde tablolarda id sütunu var)
        converted += ' RETURNING id';
    }

    return converted;
}

function initDatabase() {
    return new Promise(async (resolve, reject) => {
        // Kontrol: DATABASE_URL varsa PostgreSQL kullan
        if (process.env.DATABASE_URL) {
            console.log('🌍 DATABASE_URL tespit edildi, PostgreSQL moduna geçiliyor...');
            dbType = 'postgres';

            pgPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false // Render/Supabase için gerekli
                }
            });

            try {
                // Bağlantı testi
                await pgPool.query('SELECT NOW()');
                console.log('✅ PostgreSQL bağlantısı başarılı (Supabase/Render)');

                // Schema kontrolü ve kurulumu
                const schema = fs.readFileSync(SCHEMA_PATH_PG, 'utf8');
                await pgPool.query(schema);
                console.log('✅ PostgreSQL şeması doğrulandı');

                resolve(pgPool);
            } catch (err) {
                console.error('❌ PostgreSQL bağlantı hatası:', err.message);
                // PG başarısız olursa SQLite'a düşmeyi deneyebiliriz, 
                // ama genelde prod hatası kritikse durmak daha iyidir.
                // Şimdilik hatayı fırlatıyoruz.
                reject(err);
            }

        } else {
            console.log('📂 DATABASE_URL bulunamadı, Yerel SQLite kullanılıyor...');
            dbType = 'sqlite';

            sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ SQLite bağlantı hatası:', err.message);
                    reject(err);
                } else {
                    console.log('✅ SQLite veritabanına bağlanıldı');

                    // Schema'yı çalıştır
                    const schema = fs.readFileSync(SCHEMA_PATH_SQLITE, 'utf8');
                    sqliteDb.exec(schema, async (err) => {
                        if (err) {
                            console.error('❌ Schema oluşturma hatası:', err.message);
                            reject(err);
                        } else {
                            console.log('✅ SQLite tabloları hazır');
                            // Migration: aura_points sütunu check (Eski koddan miras)
                            try {
                                await new Promise((res) => {
                                    sqliteDb.run("ALTER TABLE users ADD COLUMN aura_points INTEGER DEFAULT 0", (err) => res());
                                });
                            } catch (e) { }

                            resolve(sqliteDb);
                        }
                    });
                }
            });
        }
    });
}

// Query helper fonksiyonları (Hibrit)

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (dbType === 'postgres') {
            const pgSql = convertToPgSql(sql);
            pgPool.query(pgSql, params)
                .then(res => resolve(res.rows))
                .catch(err => {
                    console.error('PG Query Error:', err.message, '\nSQL:', pgSql);
                    reject(err);
                });
        } else {
            sqliteDb.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('SQLite Query Error:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        }
    });
}

function queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (dbType === 'postgres') {
            const pgSql = convertToPgSql(sql);
            pgPool.query(pgSql, params)
                .then(res => resolve(res.rows[0]))
                .catch(err => {
                    console.error('PG QueryOne Error:', err.message);
                    reject(err);
                });
        } else {
            sqliteDb.get(sql, params, (err, row) => {
                if (err) {
                    console.error('SQLite QueryOne Error:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        }
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (dbType === 'postgres') {
            const pgSql = convertToPgSql(sql);
            pgPool.query(pgSql, params)
                .then(res => {
                    // SQLite benzeri dönüş formatı
                    // INSERT ise id döndür (RETURNING id kullandığımız varsayımıyla)
                    const insertedId = res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : 0;
                    const result = {
                        id: insertedId,
                        lastID: insertedId, // Compatibility for older code
                        changes: res.rowCount
                    };
                    resolve(result);
                })
                .catch(err => {
                    console.error('PG Run Error:', err.message, '\nSQL:', pgSql);
                    reject(err);
                });
        } else {
            sqliteDb.run(sql, params, function (err) {
                if (err) {
                    console.error('SQLite Run Error:', err.message);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        lastID: this.lastID, // Ensure both are present
                        changes: this.changes
                    });
                }
            });
        }
    });
}

function closeDatabase() {
    return new Promise(async (resolve, reject) => {
        if (dbType === 'postgres' && pgPool) {
            await pgPool.end();
            console.log('✅ PostgreSQL bağlantısı kapatıldı');
            resolve();
        } else if (sqliteDb) {
            sqliteDb.close((err) => {
                if (err) reject(err);
                else {
                    console.log('✅ SQLite bağlantısı kapatıldı');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initDatabase,
    query,
    queryOne,
    run,
    closeDatabase,
    getDb: () => (dbType === 'postgres' ? pgPool : sqliteDb)
};
