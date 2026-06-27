import { Router } from 'express';
import { loginUser, registerUser } from '../controllers/auth.controller.js';

const router = Router();

// Public Authentication endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;