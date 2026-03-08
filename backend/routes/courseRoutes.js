import express from "express";
import { createCourse,updateCourse,deleteCourse,getCourse,getAllCourses, getCourseCatalog } from "../controllers/courseController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";

const router=express.Router();
router.get('/catalog',authMiddleware,getAllCourses);
router.post('/course',authMiddleware,authRoles('admin'),createCourse);
router.get('/course/:id',authMiddleware,authRoles('admin'),getCourse);
router.put('/course/:id',authMiddleware,authRoles('admin'),updateCourse);
router.delete('/course/:id',authMiddleware,authRoles('admin'),deleteCourse);
router.get('/course-catalog',authMiddleware,getCourseCatalog);
router.get('/', (req, res) => {
    res.json({ message: 'Catalog route is working' });
  }
);
export default router;

