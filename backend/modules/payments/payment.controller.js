import * as stripeService from "./payment.service.js";


/**
 * Initiates an online payment flow using Stripe (creates Payment Intent).
 */
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


/**
 * Confirms a successful Stripe payment and updates the student's fee record.
 */
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


/**
 * Fetches the payment history/transactions for a specific fee record.
 */
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


/**
 * Retrieves the details of a successful payment for generating a receipt.
 */
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
