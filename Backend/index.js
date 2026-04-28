require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
// Endpoint solicitado por el frontend para cargar los productos globales
app.get('/productos', async (req, res) => {
    try {
        const text = 'SELECT nombre, marca, precio_venta, categoria, stock FROM productos';
        const { rows } = await db.query(text);
        res.json(rows);
    } catch (err) {
        console.error('Error ejecutando query libre:', err.message);
        res.status(500).json({ error: 'Error del servidor al obtener productos' });
    }
});

// Endpoint para OBTENER los productos de un tendero individual
app.get('/api/productos/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const text = 'SELECT * FROM productos WHERE id_tendero = $1';
        const { rows } = await db.query(text, [id_tendero]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching prod:', err.message);
        res.status(500).json({ error: 'Error en BD de inventario' });
    }
});

// Endpoint para INSERTAR mediante Modal un producto al tendero individual
app.post('/api/productos', async (req, res) => {
    const { id_tendero, nombre, marca, categoria, precio_venta, stock } = req.body;
    try {
        const text = 'INSERT INTO productos(id_tendero, nombre, marca, categoria, precio_venta, stock) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [id_tendero, nombre, marca, categoria, parseFloat(precio_venta), parseInt(stock, 10)];
        const result = await db.query(text, values);
        res.json({ success: true, producto: result.rows[0] });
    } catch (err) {
        console.error('Error inserting prod:', err.message);
        res.status(500).json({ error: 'Error al reservar en BD. Posible causa: Tabla `productos` no se encuentra estructurada.' });
    }
});

// Endpoint: Login Real blindado
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
            SELECT id_cliente AS id, nombre, email, password, 'consumer' AS rol FROM cliente WHERE email = $1
            UNION
            SELECT id_tendero AS id, nombre, email, password, 'merchant' AS rol FROM tendero WHERE email = $1
        `;
        console.log('Ejecutando login con email:', email);
        const result = await db.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (user.password !== hashPassword(password)) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Success
        return res.status(200).json({ success: true, message: 'Login exitoso', id: user.id, nombre: user.nombre, role: user.rol });
    } catch (err) {
        console.error('Error en el login:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint Unificado: Registro
app.post('/api/registro', async (req, res) => {
    console.log("Datos recibidos:", req.body);
    const { role, nombre, email, password, nombre_tienda, codigo } = req.body;
    const hashedPassword = hashPassword(password);

    if (role === 'consumer') {
        try {
            const text = 'INSERT INTO cliente(nombre, email, password) VALUES($1, $2, $3) RETURNING *';
            const values = [nombre, email, hashedPassword];
            const result = await db.query(text, values);
            console.log("Resultado DB (cliente):", result.rows[0]);
            return res.json({ success: true, message: 'Usuario cliente registrado en CLIENTE', role: 'consumer', nombre: result.rows[0].nombre, id: result.rows[0].id_cliente || result.rows[0].id });
        } catch (err) {
            console.error("ERROR DETALLADO DB:", err);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
    } else if (role === 'merchant') {
        if (codigo !== 'CUCUTA2026') {
            return res.status(403).json({ error: 'Código de invitación inválido. No cuenta con permisos.' });
        }
        try {
            const text = 'INSERT INTO tendero(nombre, email, password, nombre_tienda, codigo_invitacion) VALUES($1, $2, $3, $4, $5) RETURNING *';
            const values = [nombre, email, hashedPassword, nombre_tienda, codigo];
            const result = await db.query(text, values);
            console.log("Resultado DB (tendero):", result.rows[0]);
            return res.json({ success: true, message: 'Usuario tendero registrado en TENDERO', role: 'merchant', nombre: result.rows[0].nombre, id: result.rows[0].id_tendero || result.rows[0].id });
        } catch (err) {
            console.error("ERROR DETALLADO DB:", err);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
    } else {
        return res.status(400).json({ error: 'Falta proveer un rol válido (consumer o merchant).' });
    }
});

// Endpoint: Verificar Correo para Recuperación
app.post('/api/verificar-correo', async (req, res) => {
    const { email } = req.body;
    try {
        const text = 'SELECT id_tendero FROM tendero WHERE email = $1';
        const { rows } = await db.query(text, [email]);
        if (rows.length > 0) {
            res.status(200).json({ success: true, message: 'Correo verificado' });
        } else {
            res.status(404).json({ error: 'El correo no existe en la base de datos de tenderos.' });
        }
    } catch (err) {
        console.error('Error verificando correo:', err.message);
        res.status(500).json({ error: 'Error interno verificando el correo' });
    }
});

// Endpoint: Actualizar Contraseña
app.post('/api/actualizar-password', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = hashPassword(password);
    try {
        const text = 'UPDATE tendero SET password = $1 WHERE email = $2 RETURNING id_tendero';
        const { rows } = await db.query(text, [hashedPassword, email]);
        if (rows.length > 0) {
            res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
        } else {
            res.status(404).json({ error: 'No se pudo actualizar la contraseña. Usuario no encontrado.' });
        }
    } catch (err) {
        console.error('Error actualizando contraseña:', err.message);
        res.status(500).json({ error: 'Error interno al actualizar la contraseña' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Servidor iniciado correctamente en http://localhost:${port}`);
    console.log(`La base de datos buscará conectarse a: postgres://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});
