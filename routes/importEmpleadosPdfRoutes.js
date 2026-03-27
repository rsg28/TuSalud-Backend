const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { procesarPdfEmpleados } = require('../controllers/importEmpleadosPdfController');

const router = express.Router();

const maxMb = parseInt(process.env.PDF_IMPORT_MAX_MB || '25', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okMime = (file.mimetype || '').toLowerCase() === 'application/pdf';
    const name = (file.originalname || '').toLowerCase();
    const okExt = name.endsWith('.pdf');
    if (okMime || okExt) return cb(null, true);
    cb(new Error('Solo se aceptan archivos PDF.'));
  },
});

function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `El PDF supera el tamaño máximo (${maxMb} MB).` });
    }
    return res.status(400).json({ error: err.message || 'Error al subir el archivo' });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Archivo no válido' });
  }
  next();
}

router.post(
  '/empleados-pdf',
  authenticateToken,
  (req, res, next) => {
    upload.single('file')(req, res, (e) => {
      if (e) return multerErrorHandler(e, req, res, next);
      next();
    });
  },
  procesarPdfEmpleados
);

module.exports = router;
