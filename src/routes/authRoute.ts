import express from 'express';
import { 
  register,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  syncSupabaseUsers
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { 
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../validations/auth.validation';
import { logger } from '../utils/logger';

const authRouter = express.Router();

// Debug middleware to log incoming requests
authRouter.use((req, _res, next) => {
  if (req.path === '/register' || req.path === '/login') {
    logger.info('Auth request received:', {
      path: req.path,
      method: req.method,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    });
  }
  next();
});

// Public routes
authRouter.post('/test', (req, res) => {
  logger.info('Test endpoint hit:', {
    body: req.body,
    headers: req.headers,
    method: req.method,
    path: req.path
  });
  res.json({ 
    message: 'Test endpoint working',
    receivedBody: req.body,
    contentType: req.headers['content-type']
  });
});

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

// Admin routes
authRouter.post('/sync-users', syncSupabaseUsers);

// Protected routes
authRouter.post('/change-password',
  authenticate,
  validate(changePasswordSchema),
  updatePassword
);

export default authRouter;