import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import authRoles from '../middleware/authRoles.js';
import attachUser from '../middleware/attachUser.js';
import { 
   applyForHostel, getAllApplications, getMyApplication, cancelApplication, updateApplicationStatus
} from '../controllers/hostelController.js';

const router = express.Router();

// ─── Student routes — attachUser ensures we get gender/studentId from DB ─────
router.post('/', authMiddleware, authRoles('student'), attachUser, applyForHostel);
router.get('/me', authMiddleware, authRoles('student'), attachUser, getMyApplication);
router.put('/:id', authMiddleware, authRoles('student'), attachUser, cancelApplication);

// ─── hostelAdmin: Application management ────────────────────────────
router.get('/', authMiddleware, authRoles('hostelAdmin'), getAllApplications);
router.patch('/:id', authMiddleware, authRoles('hostelAdmin'), updateApplicationStatus);

export default router;