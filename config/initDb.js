const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initDb() {
  try {
    // Önce tabloları sil
    await pool.query('DROP TABLE IF EXISTS comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('Eski tablolar silindi');

    // Schema dosyasını oku
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Yeni tabloları oluştur
    await pool.query(schema);
    console.log('Yeni tablolar oluşturuldu');

    console.log('Veritabanı başarıyla yeniden başlatıldı');
  } catch (err) {
    console.error('Veritabanı başlatma hatası:', err);
  } finally {
    pool.end();
  }
}

initDb(); 