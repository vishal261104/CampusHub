import express from "express";
import { createCourse,updateCourse,deleteCourse,getCourse,getAllCourses } from "./course.controller.js";
import { createCourseOffering, getCourseCatalog, updateOffering ,deleteOffering,listOfferings,getOffering,assignFacultyToOffering} from "./courseOffering.controller.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";

const router=express.Router();

/**
 * GET /api/courses/catalog
 * Fetches all master courses from the catalog.
 */
router.get('/catalog',authMiddleware,getAllCourses);

/**
 * POST /api/courses/course
 * Creates a new master course in the catalog (Admin only).
 */
router.post('/course',authMiddleware,authRoles('admin'),createCourse);

/**
 * GET /api/courses/course/:id
 * Fetches details of a specific master course.
 */
router.get('/course/:id',authMiddleware,getCourse); 

/**
 * PUT /api/courses/course/:id
 * Updates details of an existing master course (Admin only).
 */
router.put('/course/:id',authMiddleware,authRoles('admin'),updateCourse);

/**
 * DELETE /api/courses/course/:id
 * Permanently deletes a master course from the catalog (Admin only).
 */
router.delete('/course/:id',authMiddleware,authRoles('admin'),deleteCourse);


// ─── COURSE OFFERINGS ROUTES ──────────────────────────────────────────────────────

/**
 * POST /api/courses/course-offering
 * Creates a new course offering for a specific semester/year (Admin only).
 */
router.post('/course-offering',authMiddleware,authRoles('admin'),createCourseOffering);

/**
 * GET /api/courses/course-offerings
 * Fetches all active course offerings (Admin and Faculty).
 */
router.get('/course-offerings',authMiddleware,authRoles('admin','faculty'),listOfferings);

/**
 * GET /api/courses/course-offering/:id
 * Fetches details of a specific course offering.
 */
router.get('/course-offering/:id',authMiddleware,getOffering);

/**
 * PUT /api/courses/course-offering/:id
 * Updates details of an existing course offering (Admin only).
 */
router.put('/course-offering/:id',authMiddleware,authRoles('admin'),updateOffering);

/**
 * DELETE /api/courses/course-offering/:id
 * Deletes a course offering (Admin only).
 */
router.delete('/course-offering/:id',authMiddleware,authRoles('admin'),deleteOffering);

/**
 * GET /api/courses/course-catalog
 * Alternative endpoint to fetch the catalog of course offerings.
 */
router.get('/course-catalog',authMiddleware,getCourseCatalog);

/**
 * PATCH /api/courses/course-offering/:id/faculty
 * Assigns a specific faculty member to a course offering (Admin only).
 */
router.patch('/course-offering/:id/faculty',authMiddleware,authRoles('admin'),assignFacultyToOffering);


router.get('/', (req, res) => {
    res.json({ message: 'Catalog route is working' });
  }
);

export default router;
