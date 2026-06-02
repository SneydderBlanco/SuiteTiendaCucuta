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

// Diagnóstico y migraciones iniciales al arrancar
(async () => {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tablas visibles desde el servidor:", res.rows.map(r => r.table_name));
        
        // Ejecutar migración de clave foránea de venta si existe
        if (res.rows.some(r => r.table_name === 'venta')) {
            console.log("Verificando clave foránea de la tabla venta...");
            await pool.query(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM pg_constraint c
                        JOIN pg_class t ON c.conrelid = t.oid
                        JOIN pg_class r ON c.confrelid = r.oid
                        WHERE c.conname = 'venta_id_tienda_fkey' AND t.relname = 'venta' AND r.relname = 'tienda'
                    ) THEN
                        RAISE NOTICE 'Corrigiendo clave foránea venta_id_tienda_fkey para apuntar a tendero...';
                        ALTER TABLE venta DROP CONSTRAINT venta_id_tienda_fkey;
                        ALTER TABLE venta ADD CONSTRAINT venta_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES tendero(id_tendero) ON DELETE CASCADE;
                    END IF;
                END $$;
            `);
            console.log("Verificación de clave foránea completada.");
        }
    } catch (err) {
        console.error("Error en inicialización / migración de base de datos:", err.message);
    }
})();

pool.on('error', (err, client) => {
    console.error('Error inesperado en PostgreSQL:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};