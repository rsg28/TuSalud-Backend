const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { procesarDocumentoEmpleados } = require('../controllers/documentoEmpleadosController');

const router = express.Router();

const maxMb = parseInt(process.env.DOCUMENTO_IMPORT_MAX_MB || process.env.PDF_IMPORT_MAX_MB || '25', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const m = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const okMime =
      m === 'application/pdf' ||
      m === 'image/jpeg' ||
      m === 'image/jpg' ||
      m === 'image/png' ||
      m === 'image/webp';
    const okExt = /\.(pdf|jpe?g|png|webp)$/i.test(name);
    if (okMime || okExt) return cb(null, true);
    cb(new Error('Solo se aceptan PDF o imágenes (JPEG, PNG, WebP).'));
  },
});

function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `El archivo supera el tamaño máximo (${maxMb} MB).` });
    }
    return res.status(400).json({ error: err.message || 'Error al subir el archivo' });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Archivo no válido' });
  }
  next();
}

router.post(
  '/documento-empleados',
  authenticateToken,
  (req, res, next) => {
    upload.single('file')(req, res, (e) => {
      if (e) return multerErrorHandler(e, req, res, next);
      next();
    });
  },
  procesarDocumentoEmpleados
);

module.exports = router;
