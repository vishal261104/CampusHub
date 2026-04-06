import express from "express";
import {
  enrollInCourse,
  dropCourse,
  getEnrollments,
} from "../controllers/enrollmentController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authRoles from "../middleware/authRoles.js";

const router = express.Router();

router.post("/enroll/:id", authMiddleware, authRoles("student"), enrollInCourse);
router.delete("/drop/:id", authMiddleware, authRoles("student"), dropCourse);
router.get("/", authMiddleware, authRoles("student"), getEnrollments);

export default router;