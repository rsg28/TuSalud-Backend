const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getCurrentUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Validaciones para registro.
// Solo se permite registro público para los roles `cliente` y `paciente`.
// vendedor / manager se crean por administración.
const registerValidation = [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre_completo').notEmpty().withMessage('El nombre completo es requerido'),
  body('rol').optional().isIn(['cliente', 'paciente']).withMessage('Rol no permitido en registro público'),
  body('dni').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6, max: 20 }).withMessage('DNI inválido'),
  body('ruc').optional({ nullable: true, checkFalsy: true }).isLength({ min: 8, max: 20 }).withMessage('RUC inválido'),
  body('tipo_ruc').optional({ nullable: true, checkFalsy: true }).isIn(['NINGUNO', 'RUC10', 'RUC20']).withMessage('tipo_ruc inválido'),
  body('sexo').optional({ nullable: true, checkFalsy: true }).isIn(['HOMBRE', 'MUJER']).withMessage('sexo inválido'),
  body('fecha_nacimiento').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('fecha_nacimiento inválida (YYYY-MM-DD)'),
  // Para paciente, DNI es obligatorio (sirve para enlazar con pedido_pacientes)
  body().custom((value) => {
    const rol = value?.rol || 'cliente';
    if (rol === 'paciente') {
      const dni = String(value?.dni || '').trim();
      if (!dni) {
        throw new Error('El DNI es obligatorio para el rol paciente');
      }
    }
    return true;
  }),
];

// Validaciones para login
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email inválido')
];

const resetPasswordValidation = [
  // Se permite restablecer por:
  // - token (link) + newPassword
  // - email + codigo (OTP) + newPassword
  body('newPassword').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body().custom((value) => {
    const token = value?.token;
    const email = value?.email;
    const codigo = value?.codigo;
    const hasToken = typeof token === 'string' && token.trim().length > 0;
    const hasOtp = typeof email === 'string' && email.trim().length > 0 && (codigo != null && String(codigo).trim().length > 0);
    if (!hasToken && !hasOtp) {
      throw new Error('Debes enviar token o email+código');
    }
    return true;
  }),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
