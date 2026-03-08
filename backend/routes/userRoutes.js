import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import authRoles from '../middleware/authRoles.js';
import { setUserRole } from '../controllers/setUserRole.js';
import { setUserRoleByEmail } from '../controllers/setUserRoleByEmail.js';
import { getMe, updateMe ,updatePassword} from '../controllers/userController.js';
 
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'User route is working' });
  });
router.patch('/:id/role',authMiddleware,authRoles('admin'),setUserRole);
router.patch('/role', authMiddleware, authRoles('admin'), setUserRoleByEmail);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.patch('/me/password', authMiddleware, updatePassword);


export default router;
