require('dotenv').config();
const { Pool } = require('pg');


const pool = new Pool({
    host: (process.env.DB_HOST || 'localhost').trim(),
    user: (process.env.DB_USER || 'postgres').trim(),
    password: (process.env.DB_PASS || '').trim(),
    database: (process.env.DB_NAME || 'tienda_cucuta_db').trim(),
    port: parseInt(process.env.DB_PORT) || 5432,
});

console.log(`--- Intento de conexión ---`);
console.log(`Base de datos configurada: [${(process.env.DB_NAME || 'tienda_cucuta_db').trim()}]`);

pool.on('error', (err, client) => {
    console.error('Error inesperado en PostgreSQL:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};