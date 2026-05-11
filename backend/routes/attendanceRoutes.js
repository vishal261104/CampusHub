import express from "express";
import { getAttendance,markAttendance,getEnrolledStudents,getCourseAttendance } from "../controllers/attendanceController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";

const router = express.Router();

router.get("/attendance/students/:courseOfferingId/", authMiddleware, authRoles("faculty"), getEnrolledStudents);
router.post("/attendance/mark", authMiddleware, authRoles("faculty"), markAttendance);
router.get("/attendance/course-offering/:courseOfferingId/", authMiddleware, authRoles("faculty"), getCourseAttendance);
router.get("/attendance/my/", authMiddleware, authRoles("student"), getAttendance);

export default router;