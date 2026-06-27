import * as stripeService from "./payment.service.js";

// POST /api/payments/intent
export const createPaymentIntent = async (req, res, next) => {
    try {
        const result = await stripeService.createPaymentIntent(
            req.userDoc._id,
            req.body
        );
        return res.status(201).json(result);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// POST /api/payments/confirm
export const confirmPayment = async (req, res, next) => {
    try {
        const { feePayment, feeRecord } = await stripeService.confirmPayment(
            req.userDoc._id,
            req.body
        );
        return res.status(200).json({
            message: `Payment of ₹${feePayment.amount} confirmed successfully`,
            feePayment,
            feeRecord,
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// GET /api/payments/history/:feeRecordId
export const getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await stripeService.getPaymentHistory(
            req.userDoc._id,
            req.params.feeRecordId
        );
        return res.status(200).json({ count: payments.length, payments });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};

// GET /api/payments/receipt/:paymentId
export const getReceipt = async (req, res, next) => {
    try {
        const payment = await stripeService.getReceipt(
            req.userDoc._id,
            req.params.paymentId
        );
        return res.status(200).json({ payment });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ message: err.message });
        next(err);
    }
};
