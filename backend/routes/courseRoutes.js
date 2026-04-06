import express from "express";
import { createCourse,updateCourse,deleteCourse,getCourse,getAllCourses } from "../controllers/courseController.js";
import { createCourseOffering, getCourseCatalog, updateOffering ,deleteOffering,listOfferings,getOffering,assignFacultyToOffering} from "../controllers/courseOfferingController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";

const router=express.Router();

router.get('/catalog',authMiddleware,getAllCourses);
router.post('/course',authMiddleware,authRoles('admin'),createCourse);
router.get('/course/:id',authMiddleware,authRoles('admin'),getCourse);
router.put('/course/:id',authMiddleware,authRoles('admin'),updateCourse);
router.delete('/course/:id',authMiddleware,authRoles('admin'),deleteCourse);


router.post('/course-offering',authMiddleware,authRoles('admin'),createCourseOffering);
router.get('/course-offerings',authMiddleware,authRoles('admin','faculty'),listOfferings);
router.get('/course-offering/:id',authMiddleware,getOffering);
router.put('/course-offering/:id',authMiddleware,authRoles('admin'),updateOffering);
router.delete('/course-offering/:id',authMiddleware,authRoles('admin'),deleteOffering);
router.get('/course-catalog',authMiddleware,getCourseCatalog);
router.patch('/course-offering/:id/faculty',authMiddleware,authRoles('admin'),assignFacultyToOffering);

router.get('/', (req, res) => {
    res.json({ message: 'Catalog route is working' });
  }
);
export default router;

