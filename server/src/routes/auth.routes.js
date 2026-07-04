import { Router } from 'express';
import { loginUser, logoutUser, registerUser } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public Authentication endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', authenticate, logoutUser);

export default router;