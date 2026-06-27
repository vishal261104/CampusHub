import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import attachUser from "../../middleware/attachUser.js";
import { getMyNotifications, markAllRead, markOneRead } from "./notification.controller.js";

const router = express.Router();

// All notification routes require authentication + user document
router.use(authMiddleware, attachUser);

router.get("/",                 getMyNotifications);
router.patch("/read-all",       markAllRead);
router.patch("/:id/read",       markOneRead);

export default router;
