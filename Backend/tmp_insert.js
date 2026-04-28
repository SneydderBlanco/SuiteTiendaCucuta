const db = require('./db');
(async () => {
    try {
        const text = 'INSERT INTO tendero(nombre, nombre_tienda, email, password, codigo) VALUES($1, $2, $3, $4, $5) RETURNING *';
        const values = ['Test', 'Test Tienda', 'test@test.com', '123', 'CUCUTA2026'];
        const result = await db.query(text, values);
        console.log("OK", result.rows);
    } catch(err) {
        console.error("ERR", err);
    } finally {
        process.exit(0);
    }
})();
