const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getCurrentUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Validaciones para registro
const registerValidation = [
  body('nombre_usuario').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre_completo').notEmpty().withMessage('El nombre completo es requerido')
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
