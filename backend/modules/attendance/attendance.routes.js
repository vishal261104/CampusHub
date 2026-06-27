import express from "express";
import { getAttendance,markAttendance,getEnrolledStudents,getCourseAttendance } from "./attendance.controller.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";

const router = express.Router();

router.get("/students/:courseOfferingId/", authMiddleware, authRoles("faculty"), getEnrolledStudents);
router.post("/mark", authMiddleware, authRoles("faculty"), markAttendance);
router.get("/course-offering/:courseOfferingId/", authMiddleware, authRoles("faculty"), getCourseAttendance);
router.get("/my/", authMiddleware, authRoles("student"), getAttendance);

export default router;