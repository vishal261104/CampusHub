import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
    {
        // Who paid
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // Which semester fee record this payment applies to
        feeRecordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentFeeRecord",
            required: true,
        },
        semester: { type: String, required: true },
        year:     { type: Number, required: true },

        // Amount paid in THIS single transaction (₹)
        amount: {
            type: Number,
            required: true,
            min: 1,
        },

        // Stripe identifiers — set when order is created
        stripePaymentIntentId: {
            type: String,
            required: true,
            unique: true,
        },

        // Stripe payment method details — set after success
        stripePaymentMethodId: {
            type: String,
            default: null,
        },

        // "created" → student initiated; "succeeded" → payment confirmed; "failed" → payment failed
        status: {
            type: String,
            enum: ["created", "succeeded", "failed"],
            default: "created",
        },

        // Human-readable Stripe receipt URL (populated on success)
        receiptUrl: {
            type: String,
            default: null,
        },

        // Auto-generated receipt number (set on payment success) — e.g. RCPT-2025-000042
        receiptNumber: {
            type: String,
            default: null,
            index: true,
        },
    },
    { timestamps: true }
);

feePaymentSchema.index({ feeRecordId: 1 });
feePaymentSchema.index({ status: 1 });

export default mongoose.model("FeePayment", feePaymentSchema);
