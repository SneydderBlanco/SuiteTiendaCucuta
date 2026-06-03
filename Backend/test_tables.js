const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_e1bMPariupG4@ep-fragrant-frog-aqr2ordk-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log("Ejecutando migración de clave foránea en Neon...");
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
        console.log("¡Migración ejecutada con éxito!");
    } catch (e) {
        console.error("Error en migración:", e);
    } finally {
        pool.end();
    }
}

main();
