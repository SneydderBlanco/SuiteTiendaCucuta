require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const rawMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

async function processBufferFile(file) {
    if (!file || !file.buffer) return;
    const mime = file.mimetype || 'image/webp';
    const dataUri = `data:${mime};base64,${file.buffer.toString('base64')}`;

    if (hasCloudinary) {
        try {
            const uploaded = await cloudinary.uploader.upload(dataUri, {
                folder: 'tiendas_cucuta_productos',
                resource_type: 'image'
            });
            if (uploaded && uploaded.secure_url) {
                file.path = uploaded.secure_url;
                return;
            }
        } catch (err) {
            console.warn('Cloudinary fallback a Data URI:', err.message);
        }
    }

    // Fallback seguro a Data URI (persiste en PostgreSQL TEXT sin depender de disco efímero en Render)
    file.path = dataUri;
}

const upload = {
    single: (fieldName) => (req, res, next) => {
        rawMulter.single(fieldName)(req, res, async (err) => {
            if (err) {
                console.error('Error en multer single:', err.message);
                return res.status(400).json({ error: `Error al procesar archivo de imagen: ${err.message}` });
            }
            if (req.file) {
                await processBufferFile(req.file);
            }
            next();
        });
    },
    fields: (fieldsArray) => (req, res, next) => {
        rawMulter.fields(fieldsArray)(req, res, async (err) => {
            if (err) {
                console.error('Error en multer fields:', err.message);
                return res.status(400).json({ error: `Error al procesar archivos de imagen: ${err.message}` });
            }
            if (req.files && typeof req.files === 'object') {
                for (const key of Object.keys(req.files)) {
                    const list = req.files[key] || [];
                    for (const f of list) {
                        await processBufferFile(f);
                    }
                }
            }
            next();
        });
    }
};

module.exports = upload;
