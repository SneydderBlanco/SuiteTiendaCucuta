require('dotenv').config();
const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL.trim();
    const dbMatch = dbUrl.match(/@([^/]+)\/([^?]+)/);
    const dbHost = dbMatch ? dbMatch[1] : 'unknown-host';
    const dbName = dbMatch ? dbMatch[2] : 'unknown-db';
    console.log(`--- Conectándose a base de datos en host [${dbHost}] y base de datos [${dbName}] ---`);
    pool = new Pool({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });
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

// Diagnóstico inmediato de tablas al iniciar
(async () => {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tablas visibles desde el servidor:", res.rows.map(r => r.table_name));
    } catch (err) {
        console.error("Error al listar tablas en inicio:", err.message);
    }
})();

pool.on('error', (err, client) => {
    console.error('Error inesperado en PostgreSQL:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};