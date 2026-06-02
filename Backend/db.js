require('dotenv').config();
const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
    // Conexión usando String de conexión (ej. en Neon) con SSL requerido
    pool = new Pool({
        connectionString: process.env.DATABASE_URL.trim(),
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log(`--- Conectándose a base de datos usando Connection String ---`);
} else {
    // Conexión local usando variables individuales
    pool = new Pool({
        host: (process.env.DB_HOST || 'localhost').trim(),
        user: (process.env.DB_USER || 'postgres').trim(),
        password: (process.env.DB_PASS || '').trim(),
        database: (process.env.DB_NAME || 'tienda_cucuta_db').trim(),
        port: parseInt(process.env.DB_PORT) || 5432,
    });
    console.log(`--- Conectándose a base de datos local [${(process.env.DB_NAME || 'tienda_cucuta_db').trim()}] ---`);
}

pool.on('error', (err, client) => {
    console.error('Error inesperado en PostgreSQL:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};