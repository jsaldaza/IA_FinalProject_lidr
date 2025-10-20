import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validations/auth.validation';
import { 
  loginRateLimit, 
  registerRateLimit, 
  emailSpecificRateLimit,
  authGlobalRateLimit 
} from '../middleware/auth.rate-limit';

const router = express.Router();

// Aplicar rate limiting global a todas las rutas de auth
router.use(authGlobalRateLimit);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Registrar un nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Contraseña del usuario (mínimo 8 caracteres)
 *               name:
 *                 type: string
 *                 description: Nombre completo del usuario
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Datos de entrada inválidos
 *       409:
 *         description: El correo electrónico ya está registrado
 */
router.post('/register', registerRateLimit, validateRequest({ body: registerSchema }), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Iniciar sesión
 *     description: Autentica a un usuario y devuelve un token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                     token:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 *       400:
 *         description: Datos de entrada inválidos
 */
router.post('/login', loginRateLimit, emailSpecificRateLimit, validateRequest({ body: loginSchema }), AuthController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', authenticate, AuthController.logout);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);

export { router }; 
