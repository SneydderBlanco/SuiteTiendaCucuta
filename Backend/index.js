require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Configuración SMTP explícita de Nodemailer con Gmail y variables de entorno
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Error SMTP al iniciar:', error);
    } else {
        console.log('Servidor SMTP de Google listo para enviar correos');
    }
});

async function sendClientVerificationEmail(email, nombre, codigoVerificacion) {
    const htmlContent = `
        <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #f8fafc; padding: 32px 20px; border-radius: 16px; border: 1px solid #e2e8f0;">
            <div style="background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 800; font-size: 14px; padding: 8px 16px; border-radius: 9999px; letter-spacing: 0.06em; text-transform: uppercase;">
                        Tiendas Cúcuta
                    </div>
                    <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 16px 0 8px 0;">
                        ¡Bienvenido(a), ${nombre || 'Cliente'}!
                    </h1>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                        Gracias por registrarte en <strong>Tiendas Cúcuta</strong>. Para activar tu cuenta y empezar a explorar los comercios locales de San José de Cúcuta, ingresa el siguiente código de verificación:
                    </p>
                </div>

                <div style="background-color: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin-bottom: 6px;">
                        Tu código de verificación
                    </span>
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #065f46; font-family: monospace;">
                        ${codigoVerificacion}
                    </span>
                </div>

                <p style="color: #64748b; font-size: 12px; line-height: 1.5; text-align: center; margin: 20px 0 0 0;">
                    Si tú no solicitaste la creación de esta cuenta, puedes ignorar este mensaje de forma segura.
                </p>
            </div>
            <div style="text-align: center; margin-top: 16px; color: #94a3b8; font-size: 11px;">
                &copy; 2026 Tiendas Cúcuta &bull; Comercio Local Digital
            </div>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Tiendas Cúcuta" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Confirma tu cuenta en Tiendas Cúcuta',
            html: htmlContent
        });
        return info;
    } catch (error) {
        console.error('Error detallado de Nodemailer:', error);
        throw error;
    }
}

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
const upload = require('./middlewares/upload');

function generateJwtToken(payload) {
    const secret = process.env.JWT_SECRET || 'tiendas_cucuta_secret_key_2026';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const port = process.env.PORT || 3000;

// Middlewares (CORS habilitado explícitamente para Vercel y desarrollo local)
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// BLOQUE DE RUTAS DE ADMINISTRACIÓN (SUPERADMIN)
// Ubicado al inicio del archivo antes de cualquier middleware estático o ruta genérica
// ==========================================
console.log('>>> [SuperAdmin] Registrando rutas administrativas: GET/PUT/DELETE /api/admin/tiendas y GET /api/admin/tiendas/:id/productos');

app.get('/api/admin/tiendas', async (req, res) => {
    try {
        await db.query("ALTER TABLE tendero ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'tendero'");
        await db.query("ALTER TABLE tendero ADD COLUMN IF NOT EXISTS ubicacion TEXT, ADD COLUMN IF NOT EXISTS latitud NUMERIC, ADD COLUMN IF NOT EXISTS longitud NUMERIC, ADD COLUMN IF NOT EXISTS whatsapp TEXT, ADD COLUMN IF NOT EXISTS logo_url TEXT, ADD COLUMN IF NOT EXISTS descripcion TEXT");

        const tiendasQuery = `
            SELECT 
                t.id_tendero,
                t.nombre,
                t.email,
                t.nombre_tienda,
                t.descripcion,
                t.ubicacion,
                t.latitud,
                t.longitud,
                t.whatsapp,
                t.logo_url,
                COALESCE(t.rol, 'tendero') AS rol,
                COUNT(p.id_producto) AS total_productos
            FROM tendero t
            LEFT JOIN productos p ON t.id_tendero = p.id_tendero
            WHERE COALESCE(t.rol, 'tendero') != 'superadmin'
            GROUP BY t.id_tendero, t.nombre, t.email, t.nombre_tienda, t.descripcion, t.ubicacion, t.latitud, t.longitud, t.whatsapp, t.logo_url, t.rol
            ORDER BY t.id_tendero ASC
        `;
        const { rows: tiendas } = await db.query(tiendasQuery);

        const clientesCountRes = await db.query("SELECT COUNT(*)::INT AS total FROM cliente");
        const totalUsuarios = (clientesCountRes.rows[0]?.total || 0) + tiendas.length;
        const totalTiendas = tiendas.length;

        let tiendaMasActiva = 'Variedades Torcoroma';
        if (tiendas.length > 0) {
            const sortedByProd = [...tiendas].sort((a, b) => (parseInt(b.total_productos, 10) || 0) - (parseInt(a.total_productos, 10) || 0));
            if (sortedByProd[0]?.nombre_tienda) {
                tiendaMasActiva = sortedByProd[0].nombre_tienda;
            }
        }

        let productoPopular = 'Sin productos';
        const topProdRes = await db.query("SELECT nombre FROM productos ORDER BY stock DESC, id_producto ASC LIMIT 1");
        if (topProdRes.rows.length > 0) {
            productoPopular = topProdRes.rows[0].nombre;
        }

        res.json({
            success: true,
            tiendas,
            metricas: {
                total_usuarios: totalUsuarios,
                total_tiendas: totalTiendas,
                tienda_mas_activa: tiendaMasActiva,
                producto_popular: productoPopular
            }
        });
    } catch (err) {
        console.error('Error en GET /api/admin/tiendas:', err.message);
        res.status(500).json({ error: 'Error al obtener tiendas para SuperAdmin.' });
    }
});

app.get('/api/admin/tiendas/:id/productos', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(
            'SELECT * FROM productos WHERE id_tendero = $1 ORDER BY id_producto DESC',
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error en GET /api/admin/tiendas/:id/productos:', err.message);
        res.status(500).json({ error: 'Error al obtener los productos de la tienda.' });
    }
});

app.put('/api/admin/tiendas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_tienda, nombre, email, ubicacion, whatsapp, descripcion } = req.body;
    try {
        const updateQuery = `
            UPDATE tendero
            SET 
                nombre_tienda = COALESCE($1, nombre_tienda),
                nombre = COALESCE($2, nombre),
                email = COALESCE($3, email),
                ubicacion = COALESCE($4, ubicacion),
                whatsapp = COALESCE($5, whatsapp),
                descripcion = COALESCE($6, descripcion)
            WHERE id_tendero = $7
            RETURNING id_tendero, nombre, email, nombre_tienda, ubicacion, whatsapp, descripcion, latitud, longitud
        `;
        const { rows } = await db.query(updateQuery, [
            nombre_tienda,
            nombre,
            email,
            ubicacion,
            whatsapp,
            descripcion,
            id
        ]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tienda no encontrada.' });
        }

        res.json({ success: true, message: 'Tienda actualizada correctamente', tienda: rows[0] });
    } catch (err) {
        console.error('Error en PUT /api/admin/tiendas/:id:', err.message);
        res.status(500).json({ error: 'Error al actualizar la tienda en la base de datos.' });
    }
});

app.delete('/api/admin/tiendas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Borrar registros en vitrina_digital vinculados al tendero o a sus productos
        await db.query(
            'DELETE FROM vitrina_digital WHERE id_tendero = $1 OR id_producto IN (SELECT id_producto FROM productos WHERE id_tendero = $1)',
            [id]
        ).catch(() => {});

        // 2. Borrar detalles de venta vinculados a los productos del tendero o a las ventas de su tienda
        await db.query(
            'DELETE FROM detalle_venta WHERE id_producto IN (SELECT id_producto FROM productos WHERE id_tendero = $1) OR id_venta IN (SELECT id_venta FROM venta WHERE id_tienda = $1)',
            [id]
        ).catch(() => {});

        // 3. Borrar las ventas asociadas a la tienda (FK id_tienda -> tendero.id_tendero)
        await db.query('DELETE FROM venta WHERE id_tienda = $1', [id]).catch(() => {});

        // 4. Borrar registros en tabla auxiliar tienda y desvincular clientes
        await db.query('DELETE FROM tienda WHERE id_tendero = $1', [id]).catch(() => {});
        await db.query('UPDATE cliente SET id_tendero = NULL WHERE id_tendero = $1', [id]).catch(() => {});

        // 5. Eliminar los productos del tendero (WHERE id_tendero = $1)
        const deletedProducts = await db.query('DELETE FROM productos WHERE id_tendero = $1', [id]);

        // 6. Finalmente eliminar al tendero
        const { rows } = await db.query('DELETE FROM tendero WHERE id_tendero = $1 RETURNING id_tendero, nombre_tienda', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tienda no encontrada.' });
        }

        res.json({
            success: true,
            message: 'Tienda y todos sus productos asociados fueron eliminados en cascada.',
            tienda_eliminada: rows[0],
            productos_eliminados: deletedProducts.rowCount || 0
        });
    } catch (err) {
        console.error('Error en DELETE /api/admin/tiendas/:id:', err.message);
        res.status(500).json({ error: 'Error al eliminar la tienda y sus productos en cascada: ' + err.message });
    }
});

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
            WHERE nombre_tienda IS NOT NULL AND nombre_tienda != '' AND COALESCE(rol, 'tendero') != 'superadmin'
        `;
        const { rows } = await db.query(queryText);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener tiendas:', err.message);
        res.status(500).json({ error: 'Error del servidor al obtener tiendas' });
    }
});

// Endpoint para OBTENER los productos de un tendero individual
app.get('/api/productos/buscar', async (req, res) => {
    const { q = '' } = req.query;
    try {
        const searchTerm = `%${q.trim()}%`;
        const queryText = `
            SELECT 
                p.id_producto,
                p.nombre,
                p.marca,
                p.categoria,
                p.precio_venta,
                p.stock,
                p.unidad_medida,
                p.imagen_url,
                p.id_tendero,
                t.id_tendero AS id_tienda,
                t.nombre_tienda,
                t.ubicacion,
                t.logo_url
            FROM productos p
            JOIN tendero t ON p.id_tendero = t.id_tendero
            WHERE p.nombre ILIKE $1 
               OR COALESCE(p.marca, '') ILIKE $1 
               OR COALESCE(p.categoria, '') ILIKE $1
            ORDER BY p.nombre ASC
        `;
        const { rows } = await db.query(queryText, [searchTerm]);
        res.json(rows);
    } catch (err) {
        console.error('Error buscando productos globalmente:', err.message);
        res.status(500).json({ error: 'Error del servidor al buscar productos' });
    }
});

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
    const { id_tendero, nombre, marca, categoria, unidad_medida, precio_venta, stock } = req.body;
    const imagen_url = req.file ? (req.file.path || `/uploads/${req.file.filename}`) : null;
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT');
        await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(50) DEFAULT 'Unidad (Und)'");
        await db.query("ALTER TABLE tendero ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'tendero'");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente'");
        const text = 'INSERT INTO productos(id_tendero, nombre, marca, categoria, unidad_medida, precio_venta, stock, imagen_url) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
        const values = [id_tendero, nombre, marca, (categoria || '').trim(), unidad_medida || 'Unidad (Und)', parseFloat(precio_venta), parseInt(stock, 10), imagen_url];
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
    const { nombre, marca, categoria, unidad_medida, precio_venta, stock } = req.body;
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT');
        await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(50) DEFAULT 'Unidad (Und)'");
        await db.query("ALTER TABLE tendero ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'tendero'");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente'");
        let text, values;
        if (req.file) {
            const imagen_url = req.file.path || `/uploads/${req.file.filename}`;
            text = `
                UPDATE productos 
                SET nombre = $1, marca = $2, categoria = $3, unidad_medida = $4, precio_venta = $5, stock = $6, imagen_url = $7 
                WHERE id_producto = $8 
                RETURNING *
            `;
            values = [nombre, marca, (categoria || '').trim(), unidad_medida || 'Unidad (Und)', parseFloat(precio_venta), parseInt(stock, 10), imagen_url, id];
        } else {
            text = `
                UPDATE productos 
                SET nombre = $1, marca = $2, categoria = $3, unidad_medida = $4, precio_venta = $5, stock = $6 
                WHERE id_producto = $7 
                RETURNING *
            `;
            values = [nombre, marca, (categoria || '').trim(), unidad_medida || 'Unidad (Und)', parseFloat(precio_venta), parseInt(stock, 10), id];
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
const handleLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = `
            SELECT id_cliente AS id, nombre, email, password, COALESCE(rol, 'cliente') AS rol FROM cliente WHERE email = $1
            UNION
            SELECT id_tendero AS id, nombre, email, password, COALESCE(rol, 'tendero') AS rol FROM tendero WHERE email = $1
        `;
        console.log('Ejecutando login con email:', email);
        const result = await db.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (user.password !== hashPassword(password) && user.password !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Success
        const token = generateJwtToken({ id: user.id, email: user.email, rol: user.rol });
        return res.status(200).json({ success: true, message: 'Login exitoso', id: user.id, nombre: user.nombre, rol: user.rol, role: user.rol, token });
    } catch (err) {
        console.error('Error en el login:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
app.post('/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// Helper para registrar cliente con código de verificación de 6 dígitos y envío de correo
async function registerClienteWithVerification(req, res) {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }

    const hashedPassword = hashPassword(password);
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(20)");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE");

        // Verificar también si el correo ya existe antes de insertar
        const existingClient = await db.query('SELECT id_cliente FROM cliente WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (existingClient.rows.length > 0) {
            return res.status(400).json({ error: 'Este correo ya está registrado. Por favor, inicia sesión.' });
        }

        const text = `
            INSERT INTO cliente(nombre, email, password, codigo_verificacion, verificado)
            VALUES($1, $2, $3, $4, FALSE)
            RETURNING *
        `;
        const values = [nombre, email.trim(), hashedPassword, codigoVerificacion];
        const result = await db.query(text, values);
        const nuevoCliente = result.rows[0];
        console.log("Resultado DB (cliente):", nuevoCliente);

        // Enviar correo corporativo de confirmación (propaga el error al catch si falla)
        try {
            await sendClientVerificationEmail(email.trim(), nombre, codigoVerificacion);
            console.log(`Correo de confirmación enviado exitosamente a ${email}`);
        } catch (mailErr) {
            await db.query('DELETE FROM cliente WHERE id_cliente = $1', [nuevoCliente.id_cliente]).catch(() => {});
            return res.status(500).json({ error: 'Fallo al enviar correo' });
        }

        return res.json({
            success: true,
            requiresVerification: true,
            message: 'Usuario cliente registrado. Se ha enviado un código de verificación de 6 dígitos a tu correo.',
            role: 'consumer',
            nombre: nuevoCliente.nombre,
            email: nuevoCliente.email,
            verificado: nuevoCliente.verificado,
            id: nuevoCliente.id_cliente || nuevoCliente.id
        });
    } catch (err) {
        console.error("ERROR DETALLADO DB (registro cliente):", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Este correo ya está registrado. Por favor, inicia sesión.' });
        }
        return res.status(500).json({ error: 'Fallo al enviar correo' });
    }
}

// Endpoint dedicado para registro de clientes con confirmación por correo
app.post('/api/auth/registro-cliente', registerClienteWithVerification);

// Endpoint de Verificación de Cuenta para Clientes (POST /api/auth/verificar-cliente)
const handleVerificarCliente = async (req, res) => {
    const email = (req.body.email || req.body.correo || '').trim();
    const codigo = String(req.body.codigo || req.body.codigo_verificacion || '').trim();

    if (!email || !codigo) {
        return res.status(400).json({ error: 'El correo y el código de verificación son obligatorios.' });
    }

    try {
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(20)");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE");

        const selectQuery = 'SELECT * FROM cliente WHERE LOWER(email) = LOWER($1)';
        const { rows } = await db.query(selectQuery, [email]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado con ese correo electrónico.' });
        }

        const cliente = rows[0];

        if (cliente.verificado === true && !cliente.codigo_verificacion) {
            return res.status(200).json({
                success: true,
                message: 'La cuenta ya se encuentra verificada.',
                cliente: {
                    id: cliente.id_cliente,
                    nombre: cliente.nombre,
                    email: cliente.email,
                    verificado: true
                }
            });
        }

        if (!cliente.codigo_verificacion || String(cliente.codigo_verificacion).trim() !== codigo) {
            return res.status(400).json({ error: 'Código de verificación inválido o expirado.' });
        }

        const updateQuery = `
            UPDATE cliente
            SET verificado = TRUE, codigo_verificacion = NULL
            WHERE id_cliente = $1
            RETURNING id_cliente, nombre, email, verificado, COALESCE(rol, 'cliente') AS rol
        `;
        const updated = await db.query(updateQuery, [cliente.id_cliente]);
        const verifiedClient = updated.rows[0];
        const token = generateJwtToken({
            id: verifiedClient.id_cliente,
            email: verifiedClient.email,
            rol: verifiedClient.rol || 'cliente'
        });

        return res.status(200).json({
            success: true,
            message: 'Cuenta verificada correctamente.',
            token,
            id: verifiedClient.id_cliente,
            nombre: verifiedClient.nombre,
            email: verifiedClient.email,
            role: 'consumer',
            rol: verifiedClient.rol || 'cliente',
            cliente: verifiedClient,
            user: verifiedClient
        });
    } catch (err) {
        console.error('Error en POST /api/auth/verificar-cliente:', err.message);
        return res.status(500).json({ error: 'Error interno al verificar la cuenta del cliente.' });
    }
};
app.post('/api/auth/verificar-cliente', handleVerificarCliente);
app.post('/api/verificar-cliente', handleVerificarCliente);

// Endpoint Unificado: Registro
app.post('/api/registro', async (req, res) => {
    console.log("Datos recibidos:", req.body);
    const { role, nombre, email, password, nombre_tienda, codigo } = req.body;
    const hashedPassword = hashPassword(password || '');

    if (role === 'consumer' || role === 'cliente') {
        return registerClienteWithVerification(req, res);
    } else if (role === 'merchant') {
        if (codigo !== 'CUCUTA2026') {
            return res.status(403).json({ error: 'Código de invitación inválido. No cuenta con permisos.' });
        }
        try {
            const existingMerchant = await db.query('SELECT id_tendero FROM tendero WHERE LOWER(email) = LOWER($1)', [email.trim()]);
            if (existingMerchant.rows.length > 0) {
                return res.status(400).json({ error: 'Este correo ya está registrado. Por favor, inicia sesión.' });
            }
            const text = 'INSERT INTO tendero(nombre, email, password, nombre_tienda, codigo_invitacion) VALUES($1, $2, $3, $4, $5) RETURNING *';
            const values = [nombre, email, hashedPassword, nombre_tienda, codigo];
            const result = await db.query(text, values);
            console.log("Resultado DB (tendero):", result.rows[0]);
            return res.json({ success: true, message: 'Usuario tendero registrado en TENDERO', role: 'merchant', nombre: result.rows[0].nombre, id: result.rows[0].id_tendero || result.rows[0].id });
        } catch (err) {
            console.error("ERROR DETALLADO DB:", err);
            if (err.code === '23505') {
                return res.status(400).json({ error: 'Este correo ya está registrado. Por favor, inicia sesión.' });
            }
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
                logo_url = req.files['logo'][0].path || `/uploads/${req.files['logo'][0].filename}`;
            }
            if (req.files['banner'] && req.files['banner'][0]) {
                banner_url = req.files['banner'][0].path || `/uploads/${req.files['banner'][0].filename}`;
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
        await db.query("ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(50) DEFAULT 'Unidad (Und)'");
        await db.query("ALTER TABLE tendero ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'tendero'");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente'");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(20)");
        await db.query("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE");
        console.log("Columnas 'codigo_verificacion' y 'verificado' verificadas en tabla 'cliente'.");
    } catch (err) {
        console.error("Error al inicializar la tabla 'vitrina_digital':", err.message);
    }
});
