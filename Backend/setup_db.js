require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

async function setupDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CLIENTE (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);
        console.log("Tabla CLIENTE configurada con UNIQUE y NOT NULL.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS TENDERO (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                nombre_tienda VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                codigo VARCHAR(50) NOT NULL
            );
        `);
        console.log("Tabla TENDERO configurada con UNIQUE y NOT NULL.");
    } catch (e) {
        console.error("Error configurando la base de datos:", e);
    } finally {
        pool.end();
    }
}

setupDB();
