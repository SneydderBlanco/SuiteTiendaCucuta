const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_e1bMPariupG4@ep-fragrant-frog-aqr2ordk-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tablas encontradas:", res.rows);
    } catch (e) {
        console.error("Error al consultar tablas:", e);
    } finally {
        pool.end();
    }
}

main();
