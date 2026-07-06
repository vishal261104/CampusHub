import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import authRoles from '../../middleware/authRoles.js';
import {
  createRoom, getAllRooms, getRoomById, updateRoom, deleteRoom, getRoomOccupancy
} from './hostel.controller.js';

const router = express.Router();


router.post('/', authMiddleware, authRoles('hostelAdmin'), createRoom);
router.get('/', authMiddleware, authRoles('hostelAdmin'), getAllRooms);
router.get('/:id', authMiddleware, authRoles('hostelAdmin'), getRoomById);
router.put('/:id', authMiddleware, authRoles('hostelAdmin'), updateRoom);
router.delete('/:id', authMiddleware, authRoles('hostelAdmin'), deleteRoom);
router.get('/:id/occupancy', authMiddleware, authRoles('hostelAdmin'), getRoomOccupancy);

export default router;
