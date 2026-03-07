import express from 'express';
import { register, login } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/', (req, res) => {
  res.json({ message: 'Auth route is working' });
});

export default router;
