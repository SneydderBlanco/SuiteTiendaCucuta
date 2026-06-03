require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads/')) {
            fs.mkdirSync('uploads/');
        }
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
// Endpoint solicitado por el frontend para cargar los productos globales
app.get('/productos', async (req, res) => {
    try {
        const text = 'SELECT nombre, marca, precio_venta, categoria, stock, imagen_url FROM productos';
        const { rows } = await db.query(text);
        res.json(rows);
    } catch (err) {
        console.error('Error ejecutando query libre:', err.message);
        res.status(500).json({ error: 'Error del servidor al obtener productos' });
    }
});

// Endpoint público para obtener todas las tiendas registradas con su perfil
app.get('/api/tiendas', async (req, res) => {
    try {
        // Asegurarse de que las columnas necesarias existen
        await db.query('ALTER TABLE tendero ADD COLUMN IF NOT EXISTS banner_url TEXT');
        await db.query('ALTER TABLE tendero ADD COLUMN IF NOT EXISTS latitud NUMERIC, ADD COLUMN IF NOT EXISTS longitud NUMERIC');
        await db.query('ALTER TABLE tendero ADD COLUMN IF NOT EXISTS whatsapp TEXT');
        
        const queryText = `
            SELECT id_tendero, nombre, nombre_tienda, descripcion, ubicacion, logo_url, banner_url, latitud, longitud, whatsapp 
            FROM tendero 
            WHERE nombre_tienda IS NOT NULL AND nombre_tienda != ''
        `;
        const { rows } = await db.query(queryText);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener tiendas:', err.message);
        res.status(500).json({ error: 'Error del servidor al obtener tiendas' });
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
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    const { id_tendero, nombre, marca, categoria, precio_venta, stock } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT');
        const text = 'INSERT INTO productos(id_tendero, nombre, marca, categoria, precio_venta, stock, imagen_url) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *';
        const values = [id_tendero, nombre, marca, categoria, parseFloat(precio_venta), parseInt(stock, 10), imagen_url];
        const result = await db.query(text, values);
        res.json({ success: true, producto: result.rows[0] });
    } catch (err) {
        console.error('Error inserting prod:', err.message);
        res.status(500).json({ error: 'Error al reservar en BD. Posible causa: Tabla `productos` no se encuentra estructurada.' });
    }
});

// Endpoint para ELIMINAR un producto
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const text = 'DELETE FROM productos WHERE id_producto = $1 RETURNING *';
        const { rows } = await db.query(text, [id]);
        if (rows.length > 0) {
            res.json({ success: true, message: 'Producto eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error('Error deleting prod:', err.message);
        res.status(500).json({ error: 'Error al eliminar en BD.' });
    }
});

// Endpoint para ACTUALIZAR un producto
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, categoria, precio_venta, stock } = req.body;
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT');
        let text, values;
        if (req.file) {
            const imagen_url = `/uploads/${req.file.filename}`;
            text = `
                UPDATE productos 
                SET nombre = $1, marca = $2, categoria = $3, precio_venta = $4, stock = $5, imagen_url = $6 
                WHERE id_producto = $7 
                RETURNING *
            `;
            values = [nombre, marca, categoria, parseFloat(precio_venta), parseInt(stock, 10), imagen_url, id];
        } else {
            text = `
                UPDATE productos 
                SET nombre = $1, marca = $2, categoria = $3, precio_venta = $4, stock = $5 
                WHERE id_producto = $6 
                RETURNING *
            `;
            values = [nombre, marca, categoria, parseFloat(precio_venta), parseInt(stock, 10), id];
        }
        const result = await db.query(text, values);
        
        if (result.rows.length > 0) {
            res.json({ success: true, producto: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error('Error updating prod:', err.message);
        res.status(500).json({ error: 'Error al actualizar producto en BD.' });
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

// Endpoint: Store Settings - GET
app.get('/api/tienda/configurar/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        await db.query('ALTER TABLE tendero ADD COLUMN IF NOT EXISTS descripcion TEXT, ADD COLUMN IF NOT EXISTS ubicacion TEXT, ADD COLUMN IF NOT EXISTS logo_url TEXT, ADD COLUMN IF NOT EXISTS banner_url TEXT, ADD COLUMN IF NOT EXISTS latitud NUMERIC, ADD COLUMN IF NOT EXISTS longitud NUMERIC, ADD COLUMN IF NOT EXISTS whatsapp TEXT');
        await db.query('ALTER TABLE cliente ADD COLUMN IF NOT EXISTS id_tendero INTEGER');
        await db.query('UPDATE cliente SET id_tendero = 1 WHERE id_tendero IS NULL');
        const text = 'SELECT nombre, nombre_tienda, descripcion, ubicacion, logo_url, banner_url, latitud, longitud, whatsapp FROM tendero WHERE id_tendero = $1';
        const { rows } = await db.query(text, [id_tendero]);
        if (rows.length > 0) {
            // Obtener el conteo de clientes registrados por este tendero
            const clientQuery = 'SELECT COUNT(*) AS total_clientes FROM cliente WHERE id_tendero = $1';
            const clientRes = await db.query(clientQuery, [id_tendero]);
            const totalClientes = parseInt(clientRes.rows[0].total_clientes) || 0;
            
            const storeData = rows[0];
            storeData.totalClientes = totalClientes;

            res.json({ success: true, data: storeData });
        } else {
            res.status(404).json({ error: 'Tendero no encontrado' });
        }
    } catch (err) {
        console.error('Error fetching store settings:', err.message);
        res.status(500).json({ error: 'Error interno obteniendo configuración' });
    }
});

// Endpoint: Store Settings - PUT
app.put('/api/tienda/configurar/:id_tendero', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
    const { id_tendero } = req.params;
    const { nombre, nombre_tienda, descripcion, ubicacion, latitud, longitud, whatsapp } = req.body || {};
    
    try {
        await db.query('ALTER TABLE tendero ADD COLUMN IF NOT EXISTS descripcion TEXT, ADD COLUMN IF NOT EXISTS ubicacion TEXT, ADD COLUMN IF NOT EXISTS logo_url TEXT, ADD COLUMN IF NOT EXISTS banner_url TEXT, ADD COLUMN IF NOT EXISTS latitud NUMERIC, ADD COLUMN IF NOT EXISTS longitud NUMERIC, ADD COLUMN IF NOT EXISTS whatsapp TEXT');
        
        let logo_url = null;
        let banner_url = null;

        if (req.files) {
            if (req.files['logo'] && req.files['logo'][0]) {
                logo_url = `/uploads/${req.files['logo'][0].filename}`;
            }
            if (req.files['banner'] && req.files['banner'][0]) {
                banner_url = `/uploads/${req.files['banner'][0].filename}`;
            }
        }

        let queryText = 'UPDATE tendero SET nombre = $1, nombre_tienda = $2, descripcion = $3, ubicacion = $4, whatsapp = $5';
        let values = [nombre, nombre_tienda, descripcion, ubicacion, whatsapp];
        let counter = 6;

        if (logo_url) {
            queryText += `, logo_url = $${counter}`;
            values.push(logo_url);
            counter++;
        }
        if (banner_url) {
            queryText += `, banner_url = $${counter}`;
            values.push(banner_url);
            counter++;
        }
        if (latitud !== undefined && latitud !== null) {
            const parsedLat = latitud === '' ? null : parseFloat(latitud);
            queryText += `, latitud = $${counter}`;
            values.push(parsedLat);
            counter++;
        }
        if (longitud !== undefined && longitud !== null) {
            const parsedLng = longitud === '' ? null : parseFloat(longitud);
            queryText += `, longitud = $${counter}`;
            values.push(parsedLng);
            counter++;
        }

        queryText += ` WHERE id_tendero = $${counter} RETURNING nombre, nombre_tienda, descripcion, ubicacion, logo_url, banner_url, latitud, longitud, whatsapp`;
        values.push(id_tendero);

        const { rows } = await db.query(queryText, values);
        if (rows.length > 0) {
            res.json({ success: true, message: 'Configuración actualizada', data: rows[0] });
        } else {
            res.status(404).json({ error: 'Tendero no encontrado' });
        }
    } catch (err) {
        console.error('Error updating store settings:', err.message);
        res.status(500).json({ error: 'Error interno actualizando configuración' });
    }
});

// Endpoint: Buscar Clientes
app.get('/api/clientes/buscar', async (req, res) => {
    const { q, id_tendero } = req.query;
    try {
        await db.query('ALTER TABLE cliente ADD COLUMN IF NOT EXISTS id_tendero INTEGER');
        if (!q) return res.json([]);
        const tenderoId = parseInt(id_tendero) || 1;
        const text = 'SELECT id_cliente, nombre, email FROM cliente WHERE id_tendero = $1 AND (nombre ILIKE $2 OR email ILIKE $2) LIMIT 5';
        const { rows } = await db.query(text, [tenderoId, `%${q}%`]);
        res.json(rows);
    } catch (err) {
        console.error('Error buscando clientes:', err.message);
        res.status(500).json({ error: 'Error interno buscando clientes' });
    }
});

// Endpoint: Crear Cliente Express
app.post('/api/clientes', async (req, res) => {
    const { nombre, email, id_tendero } = req.body;
    const genericPassword = hashPassword('123456'); // Hash genérico
    try {
        await db.query('ALTER TABLE cliente ADD COLUMN IF NOT EXISTS id_tendero INTEGER');
        const tenderoId = parseInt(id_tendero) || 1;
        const text = 'INSERT INTO cliente (nombre, email, password, id_tendero) VALUES ($1, $2, $3, $4) RETURNING id_cliente, nombre, email';
        const { rows } = await db.query(text, [nombre, email, genericPassword, tenderoId]);
        res.json({ success: true, cliente: rows[0] });
    } catch (err) {
        console.error('Error creando cliente:', err.message);
        res.status(500).json({ error: 'Error interno creando cliente' });
    }
});

// Endpoint: Obtener Detalles de Venta
app.get('/api/ventas/:id/detalles', async (req, res) => {
    const { id } = req.params;
    try {
        const headerQuery = `
            SELECT v.id_venta, v.fecha, v.tipo_pago, v.total, c.nombre AS nombre_cliente
            FROM venta v
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            WHERE v.id_venta = $1
        `;
        const headerRes = await db.query(headerQuery, [id]);
        
        if (headerRes.rows.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        
        const venta = headerRes.rows[0];

        const itemsQuery = `
            SELECT d.cantidad, d.precio_unitario_en_momento, p.nombre
            FROM detalle_venta d
            JOIN productos p ON d.id_producto = p.id_producto
            WHERE d.id_venta = $1
        `;
        const itemsRes = await db.query(itemsQuery, [id]);
        
        res.json({
            success: true,
            venta: venta,
            items: itemsRes.rows
        });

    } catch (err) {
        console.error('Error obteniendo detalles de venta:', err.message);
        res.status(500).json({ error: 'Error interno obteniendo detalles de venta' });
    }
});

// Endpoint: Registrar Venta y Descontar Stock
app.post('/api/ventas', async (req, res) => {
    // Nota: mapeamos id_tendero a id_tienda y asumimos que el frontend envía id_tienda o lo usamos como default 1 si no viene.
    const { id_tienda, id_cliente, tipo_pago, total, items } = req.body;
    
    try {
        await db.query('BEGIN');

        // Insertar venta (Paso 1)
        const tiendaIdFinal = id_tienda ? id_tienda : 1;
        const insertVentaText = 'INSERT INTO venta (id_tienda, id_cliente, tipo_pago, total, fecha) VALUES ($1, $2, $3, $4, NOW()) RETURNING id_venta';
        // temporalmente usamos null para id_cliente si no viene, o un valor por defecto.
        const ventaRes = await db.query(insertVentaText, [tiendaIdFinal, id_cliente || null, tipo_pago || 'efectivo', total]);
        const id_venta = ventaRes.rows[0].id_venta;

        for (let item of items) {
            // Descontar stock (Paso 3)
            const updateStockText = 'UPDATE productos SET stock = stock - $1 WHERE id_producto = $2 AND stock >= $1';
            const stockRes = await db.query(updateStockText, [item.cantidad, item.id_producto]);
            if (stockRes.rowCount === 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: `Stock insuficiente para el producto ID ${item.id_producto}` });
            }

            // Insertar detalle_venta (Paso 2 modificado con precio_unitario_en_momento)
            const insertDetalleText = 'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario_en_momento) VALUES ($1, $2, $3, $4)';
            await db.query(insertDetalleText, [id_venta, item.id_producto, item.cantidad, item.precio_unitario]);
        }

        await db.query('COMMIT');
        res.status(200).json({ success: true, message: 'Venta registrada exitosamente', id_venta });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error procesando venta:', err.message);
        res.status(500).json({ error: 'Error interno al procesar la venta' });
    }
});

// --- ENDPOINTS PARA REPORTES ---

app.get('/api/ventas/historial/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    const { q, fechaInicio, fechaFin, page = 1, limit = 10 } = req.query;
    
    try {
        let whereClauses = ['v.id_tienda = $1'];
        let values = [id_tendero];
        let paramCount = 2;

        if (q) {
            const isNumeric = !isNaN(q) && q.trim() !== '';
            if (isNumeric) {
                whereClauses.push(`(v.id_venta = $${paramCount} OR c.nombre ILIKE $${paramCount + 1} OR v.tipo_pago ILIKE $${paramCount + 1})`);
                values.push(parseInt(q), `%${q}%`);
                paramCount += 2;
            } else {
                whereClauses.push(`(c.nombre ILIKE $${paramCount} OR v.tipo_pago ILIKE $${paramCount})`);
                values.push(`%${q}%`);
                paramCount += 1;
            }
        }

        if (fechaInicio) {
            whereClauses.push(`DATE(v.fecha) >= $${paramCount}`);
            values.push(fechaInicio);
            paramCount += 1;
        }

        if (fechaFin) {
            whereClauses.push(`DATE(v.fecha) <= $${paramCount}`);
            values.push(fechaFin);
            paramCount += 1;
        }

        const whereString = whereClauses.join(' AND ');

        const countQuery = `
            SELECT COUNT(*)
            FROM venta v
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            WHERE ${whereString}
        `;
        const countRes = await db.query(countQuery, values);
        const totalItems = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;

        const dataQuery = `
            SELECT 
                v.id_venta, 
                v.fecha, 
                v.tipo_pago, 
                v.total, 
                c.nombre AS nombre_cliente
            FROM venta v
            LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
            WHERE ${whereString}
            ORDER BY v.fecha DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const dataValues = [...values, limit, offset];
        const { rows } = await db.query(dataQuery, dataValues);

        res.json({
            data: rows,
            pagination: {
                totalItems,
                totalPages: totalPages === 0 ? 1 : totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (err) {
        console.error('Error obteniendo historial de ventas:', err.message);
        res.status(500).json({ error: 'Error obteniendo historial de ventas' });
    }
});
app.get('/api/reportes/kpis/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const kpis = {
            ventas_hoy: 0,
            ventas_mes: 0,
            total_productos: 0,
            total_pedidos: 0
        };

        const resHoy = await db.query(`SELECT COALESCE(SUM(total), 0) as total FROM venta WHERE id_tienda = $1 AND DATE(fecha) = CURRENT_DATE`, [id_tendero]);
        kpis.ventas_hoy = parseFloat(resHoy.rows[0].total);

        const resMes = await db.query(`SELECT COALESCE(SUM(total), 0) as total FROM venta WHERE id_tienda = $1 AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE)`, [id_tendero]);
        kpis.ventas_mes = parseFloat(resMes.rows[0].total);

        const resPedidos = await db.query(`SELECT COUNT(*) as total FROM venta WHERE id_tienda = $1`, [id_tendero]);
        kpis.total_pedidos = parseInt(resPedidos.rows[0].total);

        const resProds = await db.query(`
            SELECT COALESCE(SUM(dv.cantidad), 0) as total 
            FROM detalle_venta dv
            JOIN venta v ON v.id_venta = dv.id_venta
            WHERE v.id_tienda = $1
        `, [id_tendero]);
        kpis.total_productos = parseInt(resProds.rows[0].total);

        res.json(kpis);
    } catch (err) {
        console.error('Error detallado obteniendo KPIs:', err.message);
        res.status(500).json({ error: 'Error obteniendo KPIs' });
    }
});

app.get('/api/dashboard/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const dashboardData = {
            ingresos_hoy: 0,
            ingresos_efectivo: 0,
            ingresos_transferencia: 0,
            facturas_hoy: 0,
            clientes_hoy: 0,
            alertas_stock: [],
            top_productos: []
        };

        // 1. Ingresos de hoy y desglose por tipo de pago
        const resIngresosTotales = await db.query(`SELECT COALESCE(SUM(total), 0) as total FROM venta WHERE id_tienda = $1 AND DATE(fecha) = CURRENT_DATE`, [id_tendero]);
        dashboardData.ingresos_hoy = parseFloat(resIngresosTotales.rows[0].total);

        const resPagos = await db.query(`SELECT tipo_pago, COALESCE(SUM(total), 0) as total FROM venta WHERE id_tienda = $1 AND DATE(fecha) = CURRENT_DATE GROUP BY tipo_pago`, [id_tendero]);
        resPagos.rows.forEach(row => {
            const tipo = row.tipo_pago ? row.tipo_pago.toLowerCase() : '';
            if (tipo.includes('efectivo')) {
                dashboardData.ingresos_efectivo += parseFloat(row.total);
            } else {
                dashboardData.ingresos_transferencia += parseFloat(row.total);
            }
        });

        // 2. Facturas de hoy
        const resFacturas = await db.query(`SELECT COUNT(*) as total FROM venta WHERE id_tienda = $1 AND DATE(fecha) = CURRENT_DATE`, [id_tendero]);
        dashboardData.facturas_hoy = parseInt(resFacturas.rows[0].total);

        // 3. Clientes únicos hoy
        const resClientes = await db.query(`SELECT COUNT(DISTINCT id_cliente) as total FROM venta WHERE id_tienda = $1 AND DATE(fecha) = CURRENT_DATE AND id_cliente IS NOT NULL`, [id_tendero]);
        dashboardData.clientes_hoy = parseInt(resClientes.rows[0].total);

        // 4. Alertas de stock crítico (<= 5)
        const resStock = await db.query(`SELECT nombre, stock FROM productos WHERE id_tendero = $1 AND stock <= 5 ORDER BY stock ASC LIMIT 5`, [id_tendero]);
        dashboardData.alertas_stock = resStock.rows;

        // 5. Top 3 Productos más vendidos
        const resTop = await db.query(`
            SELECT p.id_producto, p.nombre, p.imagen_url, p.categoria, SUM(dv.cantidad) as total_vendido 
            FROM detalle_venta dv 
            JOIN venta v ON v.id_venta = dv.id_venta 
            JOIN productos p ON p.id_producto = dv.id_producto 
            WHERE v.id_tienda = $1 
            GROUP BY p.id_producto, p.nombre, p.imagen_url, p.categoria 
            ORDER BY total_vendido DESC LIMIT 3
        `, [id_tendero]);
        dashboardData.top_productos = resTop.rows;

        res.json({ success: true, data: dashboardData });
    } catch (err) {
        console.error('Error obteniendo dashboard data:', err.message);
        res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
    }
});

app.get('/api/reportes/top-productos/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const query = `
            SELECT p.id_producto, p.nombre, p.imagen_url, p.categoria, SUM(dv.cantidad) as cantidad_vendida
            FROM detalle_venta dv
            JOIN venta v ON v.id_venta = dv.id_venta
            JOIN productos p ON p.id_producto = dv.id_producto
            WHERE v.id_tienda = $1
            GROUP BY p.id_producto, p.nombre, p.imagen_url, p.categoria
            ORDER BY cantidad_vendida DESC
            LIMIT 5
        `;
        const { rows } = await db.query(query, [id_tendero]);
        res.json(rows);
    } catch (err) {
        console.error('Error detallado obteniendo top productos:', err.message);
        res.status(500).json({ error: 'Error obteniendo top productos' });
    }
});

app.get('/api/reportes/alertas-stock/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const query = `
            SELECT id_producto, nombre, categoria, stock, marca 
            FROM productos 
            WHERE id_tendero = $1 AND stock <= 15 
            ORDER BY stock ASC
        `;
        const { rows } = await db.query(query, [id_tendero]);
        res.json(rows);
    } catch (err) {
        console.error('Error detallado obteniendo alertas de stock:', err.message);
        res.status(500).json({ error: 'Error obteniendo alertas de stock' });
    }
});

app.get('/api/reportes/semana/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    const { fecha } = req.query;
    try {
        let query;
        let values = [id_tendero];
        
        if (fecha) {
            query = `
                SELECT EXTRACT(ISODOW FROM fecha) as dia_semana, SUM(total) as total_recaudado
                FROM venta
                WHERE id_tienda = $1 
                  AND fecha >= date_trunc('week', $2::date)
                  AND fecha < date_trunc('week', $2::date) + interval '7 days'
                GROUP BY EXTRACT(ISODOW FROM fecha)
                ORDER BY dia_semana
            `;
            values.push(fecha);
        } else {
            query = `
                SELECT EXTRACT(ISODOW FROM fecha) as dia_semana, SUM(total) as total_recaudado
                FROM venta
                WHERE id_tienda = $1 
                  AND fecha >= date_trunc('week', CURRENT_DATE)
                  AND fecha < date_trunc('week', CURRENT_DATE) + interval '7 days'
                GROUP BY EXTRACT(ISODOW FROM fecha)
                ORDER BY dia_semana
            `;
        }
        
        const { rows } = await db.query(query, values);
        res.json(rows);
    } catch (err) {
        console.error('Error detallado obteniendo datos del gráfico:', err.message);
        res.status(500).json({ error: 'Error obteniendo datos del gráfico' });
    }
});

// ==========================================
// ENDPOINTS DE VITRINA DIGITAL (OFERTAS DIARIAS)
// ==========================================

// Endpoint para OBTENER las ofertas activas de un tendero
app.get('/api/vitrina/:id_tendero', async (req, res) => {
    const { id_tendero } = req.params;
    try {
        const query = `
            SELECT v.id_oferta, v.precio_oferta, v.vigencia_fecha, v.vigencia_hora, 
                   p.id_producto, p.nombre, p.marca, p.precio_venta, p.imagen_url, p.categoria
            FROM vitrina_digital v
            JOIN productos p ON v.id_producto = p.id_producto
            WHERE v.id_tendero = $1
            ORDER BY v.created_at DESC
        `;
        const { rows } = await db.query(query, [id_tendero]);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener vitrina:', err.message);
        res.status(500).json({ error: 'Error al obtener la vitrina digital.' });
    }
});

// Endpoint para REGISTRAR una nueva oferta en la vitrina
app.post('/api/vitrina', async (req, res) => {
    const { id_tendero, id_producto, precio_oferta, vigencia_fecha, vigencia_hora } = req.body;

    if (!id_tendero || !id_producto || !precio_oferta || !vigencia_fecha || !vigencia_hora) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        // 1. Validar límite estricto de 5 ofertas por tendero
        const countQuery = 'SELECT COUNT(*) FROM vitrina_digital WHERE id_tendero = $1';
        const countResult = await db.query(countQuery, [id_tendero]);
        const totalOfertas = parseInt(countResult.rows[0].count, 10);

        if (totalOfertas >= 5) {
            return res.status(400).json({ error: 'Límite alcanzado. Debes eliminar una oferta existente para habilitar un nuevo espacio.' });
        }

        // 2. Validar que el producto pertenezca al tendero y que el precio de oferta sea menor al original
        const prodQuery = 'SELECT precio_venta FROM productos WHERE id_producto = $1 AND id_tendero = $2';
        const prodResult = await db.query(prodQuery, [id_producto, id_tendero]);

        if (prodResult.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no pertenece a tu tienda.' });
        }

        const precioVenta = parseFloat(prodResult.rows[0].precio_venta);
        const pOferta = parseFloat(precio_oferta);

        if (pOferta >= precioVenta) {
            return res.status(400).json({ error: 'El precio de oferta debe ser estrictamente menor al precio regular del producto.' });
        }

        // 3. Validar duplicados (que el producto no esté ya en la vitrina)
        const dupQuery = 'SELECT * FROM vitrina_digital WHERE id_producto = $1';
        const dupResult = await db.query(dupQuery, [id_producto]);
        if (dupResult.rows.length > 0) {
            return res.status(400).json({ error: 'Este producto ya tiene una oferta activa en la vitrina.' });
        }

        // 4. Insertar la oferta
        const insertQuery = `
            INSERT INTO vitrina_digital (id_tendero, id_producto, precio_oferta, vigencia_fecha, vigencia_hora)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const { rows } = await db.query(insertQuery, [id_tendero, id_producto, pOferta, vigencia_fecha, vigencia_hora]);
        
        // Obtener el registro completo con los datos del producto
        const fullQuery = `
            SELECT v.id_oferta, v.precio_oferta, v.vigencia_fecha, v.vigencia_hora, 
                   p.id_producto, p.nombre, p.marca, p.precio_venta, p.imagen_url, p.categoria
            FROM vitrina_digital v
            JOIN productos p ON v.id_producto = p.id_producto
            WHERE v.id_oferta = $1
        `;
        const fullResult = await db.query(fullQuery, [rows[0].id_oferta]);

        res.json({ success: true, oferta: fullResult.rows[0] });
    } catch (err) {
        console.error('Error al guardar oferta:', err.message);
        res.status(500).json({ error: 'Error al registrar la oferta en la base de datos.' });
    }
});

// Endpoint para ELIMINAR una oferta de la vitrina
app.delete('/api/vitrina/:id_oferta', async (req, res) => {
    const { id_oferta } = req.params;
    try {
        const text = 'DELETE FROM vitrina_digital WHERE id_oferta = $1 RETURNING *';
        const { rows } = await db.query(text, [id_oferta]);
        if (rows.length > 0) {
            res.json({ success: true, message: 'Oferta eliminada correctamente de la vitrina' });
        } else {
            res.status(404).json({ error: 'Oferta no encontrada' });
        }
    } catch (err) {
        console.error('Error al eliminar oferta:', err.message);
        res.status(500).json({ error: 'Error al eliminar la oferta de la base de datos.' });
    }
});

// Start Server
app.listen(port, async () => {
    console.log(`Servidor iniciado correctamente en http://localhost:${port}`);
    console.log(`La base de datos buscará conectarse a: postgres://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    
    // Auto-migración: Crear tabla vitrina_digital si no existe
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS vitrina_digital (
                id_oferta SERIAL PRIMARY KEY,
                id_tendero INT REFERENCES tendero(id_tendero) ON DELETE CASCADE,
                id_producto INT REFERENCES productos(id_producto) ON DELETE CASCADE,
                precio_oferta NUMERIC(10, 2) NOT NULL,
                vigencia_fecha DATE NOT NULL,
                vigencia_hora TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabla 'vitrina_digital' verificada/creada con éxito en PostgreSQL.");
    } catch (err) {
        console.error("Error al inicializar la tabla 'vitrina_digital':", err.message);
    }
});
