import Stripe from "stripe";
import StudentFeeRecord from "../fees/studentFeeRecord.model.js";
import FeePayment from "./payment.model.js";
import Counter from "../core/counter.model.js";

// Validate key at startup so we get a clear error, not a cryptic 401
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || stripeKey.includes('your_stripe_secret_key_here')) {
    console.warn('[FeePayment] STRIPE_SECRET_KEY is not configured — online payments will be disabled.');
}
const stripe = stripeKey && !stripeKey.includes('your_stripe') ? new Stripe(stripeKey) : null;

function assertStripeConfigured() {
    if (!stripe) {
        const err = new Error(
            'Online payments are not configured yet. Please ask the administrator to add Stripe API keys.'
        );
        err.status = 503;
        throw err;
    }
}

function handleStripeError(stripeErr) {
    const status = stripeErr.type === 'StripeAuthenticationError' ? 503
                 : stripeErr.type === 'StripeCardError'           ? 402
                 : stripeErr.type === 'StripeInvalidRequestError' ? 400
                 : 502;
    const err = new Error(stripeErr.message || 'Payment gateway error');
    err.status = status;
    throw err;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function validateAmount(amount, pendingAmount) {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 50) {
        const err = new Error("Payment amount must be at least ₹50");
        err.status = 400;
        throw err;
    }
    if (amt > pendingAmount) {
        const err = new Error(
            `Payment amount (₹${amt}) cannot exceed pending amount (₹${pendingAmount})`
        );
        err.status = 400;
        throw err;
    }
    return Math.round(amt);
}

/**
 * Generate a unique receipt number: RCPT-YYYY-NNNNNN
 */
async function generateReceiptNumber() {
    const year = new Date().getFullYear();
    const prefix = `RCPT-${year}`;
    const seq = await Counter.getNext(prefix);
    return `${prefix}-${String(seq).padStart(6, '0')}`;
}

// ─── SERVICE FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent for a partial/full fee payment.
 * Returns { clientSecret, paymentIntentId, publishableKey }
 */
export async function createPaymentIntent(studentId, { feeRecordId, amount }) {
    assertStripeConfigured();

    const feeRecord = await StudentFeeRecord.findById(feeRecordId).populate("studentId", "name email");
    if (!feeRecord) {
        const err = new Error("Fee record not found");
        err.status = 404;
        throw err;
    }
    if (String(feeRecord.studentId._id) !== String(studentId)) {
        const err = new Error("Not authorized to pay this fee record");
        err.status = 403;
        throw err;
    }
    if (feeRecord.status === "Paid") {
        const err = new Error("This fee record is already fully paid");
        err.status = 400;
        throw err;
    }

    const pendingAmount = feeRecord.totalAmount - feeRecord.paidAmount;
    const validatedAmount = validateAmount(amount, pendingAmount);

    let paymentIntent;
    try {
        paymentIntent = await stripe.paymentIntents.create({
            amount: validatedAmount * 100, // paise
            currency: "inr",
            automatic_payment_methods: { enabled: true },
            metadata: {
                studentId: String(studentId),
                feeRecordId: String(feeRecordId),
                semester: feeRecord.semester,
                year: String(feeRecord.year),
                studentEmail: feeRecord.studentId?.email || "",
            },
            description: `Fee payment — ${feeRecord.semester} ${feeRecord.year}`,
        });
    } catch (stripeErr) {
        handleStripeError(stripeErr);
    }

    await FeePayment.create({
        studentId,
        feeRecordId,
        semester: feeRecord.semester,
        year: feeRecord.year,
        amount: validatedAmount,
        stripePaymentIntentId: paymentIntent.id,
        status: "created",
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount: validatedAmount,
    };
}

/**
 * Called after the student's browser confirms the payment.
 * Retrieves the PaymentIntent from Stripe, verifies it succeeded,
 * then increments paidAmount on the StudentFeeRecord.
 * Also generates a receipt number and triggers a payment_success notification.
 */
export async function confirmPayment(studentId, { paymentIntentId }) {
    assertStripeConfigured();

    if (!paymentIntentId) {
        const err = new Error("paymentIntentId is required");
        err.status = 400;
        throw err;
    }

    let intent;
    try {
        intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeErr) {
        handleStripeError(stripeErr);
    }

    if (intent.status !== "succeeded") {
        const err = new Error(
            `Payment not confirmed. Stripe status: ${intent.status}`
        );
        err.status = 400;
        throw err;
    }

    const feePayment = await FeePayment.findOne({
        stripePaymentIntentId: paymentIntentId,
    });

    if (!feePayment) {
        const err = new Error("Payment record not found");
        err.status = 404;
        throw err;
    }
    if (String(feePayment.studentId) !== String(studentId)) {
        const err = new Error("Not authorized");
        err.status = 403;
        throw err;
    }
    if (feePayment.status === "succeeded") {
        // Idempotency: already confirmed — just return the record
        const feeRecord = await StudentFeeRecord.findById(feePayment.feeRecordId);
        return { feePayment, feeRecord };
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Update local FeePayment
    feePayment.status = "succeeded";
    feePayment.stripePaymentMethodId = intent.payment_method || null;
    feePayment.receiptUrl = intent.charges?.data?.[0]?.receipt_url || null;
    feePayment.receiptNumber = receiptNumber;
    await feePayment.save();

    // Increment paidAmount on the fee record
    const amountInRupees = intent.amount / 100;
    const feeRecord = await StudentFeeRecord.findById(feePayment.feeRecordId);
    if (!feeRecord) {
        const err = new Error("Fee record not found");
        err.status = 404;
        throw err;
    }

    feeRecord.paidAmount = Math.min(
        feeRecord.totalAmount,
        feeRecord.paidAmount + amountInRupees
    );
    feeRecord.lastUpdatedBy = null;
    await feeRecord.save();

    // Fire payment_success notification (non-blocking — don't let it crash the payment)
    try {
        const { createNotification } = await import("../notifications/notification.service.js");
        const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
        await createNotification(
            studentId,
            "payment_success",
            "Payment Successful! 🎉",
            `Your payment of ${fmtINR(amountInRupees)} for ${feeRecord.semester} ${feeRecord.year} was successful. Receipt: ${receiptNumber}`,
            { feeRecordId: feeRecord._id, paymentId: feePayment._id, amount: amountInRupees, receiptNumber }
        );
    } catch (notifErr) {
        console.warn("[payments] Failed to create notification:", notifErr.message);
    }

    return { feePayment, feeRecord };
}

/**
 * Returns all payment transactions for a student's fee record (payment history).
 */
export async function getPaymentHistory(studentId, feeRecordId) {
    const feeRecord = await StudentFeeRecord.findById(feeRecordId);
    if (!feeRecord) {
        const err = new Error("Fee record not found");
        err.status = 404;
        throw err;
    }
    if (String(feeRecord.studentId) !== String(studentId)) {
        const err = new Error("Not authorized");
        err.status = 403;
        throw err;
    }

    const payments = await FeePayment.find({ feeRecordId, status: "succeeded" })
        .sort({ createdAt: -1 });

    return payments;
}

/**
 * Returns full receipt data for a single payment, populated with student info.
 */
export async function getReceipt(studentId, paymentId) {
    const feePayment = await FeePayment.findById(paymentId)
        .populate("studentId", "name email studentId")
        .populate({ path: "feeRecordId", populate: { path: "feeBreakdown.feeStructureId" } });

    if (!feePayment) {
        const err = new Error("Receipt not found");
        err.status = 404;
        throw err;
    }
    if (String(feePayment.studentId._id) !== String(studentId)) {
        const err = new Error("Not authorized");
        err.status = 403;
        throw err;
    }
    if (feePayment.status !== "succeeded") {
        const err = new Error("Receipt only available for successful payments");
        err.status = 400;
        throw err;
    }

    return feePayment;
}
