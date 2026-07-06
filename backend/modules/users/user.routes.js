import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import authRoles from '../../middleware/authRoles.js';
import { setUserRole } from './setUserRole.js';
import { setUserRoleByEmail } from './setUserRoleByEmail.js';
import { getMe, updateMe ,updatePassword, getAllUsers} from './user.controller.js';
import { registerStudent, registerFaculty } from '../enrollments/registration.controller.js';
 
/**
 * User Routes
 * Manages user profiles, passwords, role assignments, and basic registration integrations.
 */
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'User route is working' });
  });
router.get('/all', authMiddleware, authRoles('admin'), getAllUsers);
router.patch('/:id/role',authMiddleware,authRoles('admin'),setUserRole);
router.patch('/role', authMiddleware, authRoles('admin'), setUserRoleByEmail);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.patch('/me/password', authMiddleware, updatePassword);


router.post('/register-student', authMiddleware, registerStudent);
router.post('/register-faculty', authMiddleware, registerFaculty);

export default router;
