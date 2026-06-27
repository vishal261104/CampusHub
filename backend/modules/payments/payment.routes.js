import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import authRoles from "../../middleware/authRoles.js";
import attachUser from "../../middleware/attachUser.js";

import {
    createPaymentIntent,
    confirmPayment,
    getPaymentHistory,
} from "./payment.controller.js";

const router = express.Router();

router.post("/intent", authMiddleware, authRoles("student"), attachUser, createPaymentIntent);
router.post("/confirm", authMiddleware, authRoles("student"), attachUser, confirmPayment);
router.get("/history/:feeRecordId", authMiddleware, authRoles("student"), attachUser, getPaymentHistory);

export default router;
