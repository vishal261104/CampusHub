import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import attachUser from "../../middleware/attachUser.js";
import { getMyNotifications, markAllRead, markOneRead } from "./notification.controller.js";

/**
 * Notification Routes
 * Handles user-facing notification operations such as fetching and marking as read.
 */
const router = express.Router();


router.use(authMiddleware, attachUser);

router.get("/",                 getMyNotifications);
router.patch("/read-all",       markAllRead);
router.patch("/:id/read",       markOneRead);

export default router;
