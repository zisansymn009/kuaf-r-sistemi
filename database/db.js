const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database dosya yolu
const DB_PATH = path.join(__dirname, '..', 'beautyflow.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Database bağlantısı
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Database bağlantı hatası:', err.message);
                reject(err);
            } else {
                console.log('✅ SQLite veritabanına bağlanıldı');

                // Schema'yı çalıştır
                const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
                db.exec(schema, async (err) => {
                    if (err) {
                        console.error('❌ Schema oluşturma hatası:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Database tabloları hazır');

                        // Migration: aura_points sütunu var mı kontrol et ve ekle
                        try {
                            await new Promise((res) => {
                                db.run("ALTER TABLE users ADD COLUMN aura_points INTEGER DEFAULT 0", (err) => {
                                    if (err && !err.message.includes('duplicate column name')) {
                                        console.error('Migration hatası:', err.message);
                                    }
                                    res();
                                });
                            });
                        } catch (e) { }

                        resolve(db);
                    }
                });
            }
        });
    });
}

// Query helper fonksiyonları
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Query hatası:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('Query hatası:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Run hatası:', err.message);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database bağlantısı kapatıldı');
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
    getDb: () => db
};
