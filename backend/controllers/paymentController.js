import * as stripeService from "../services/stripeService.js";

// POST /api/fees/payment/intent
// Student creates a Stripe PaymentIntent (initiates payment session)
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

// POST /api/fees/payment/confirm
// Student confirms a completed payment (backend re-verifies with Stripe)
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

// GET /api/fees/payment/history/:feeRecordId
// Student views their payment history for a specific fee record
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
