import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
    {
        
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        
        feeRecordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudentFeeRecord",
            required: true,
        },
        semester: { type: String, required: true },
        year:     { type: Number, required: true },

        
        amount: {
            type: Number,
            required: true,
            min: 1,
        },

        
        stripePaymentIntentId: {
            type: String,
            required: true,
            unique: true,
        },

        
        stripePaymentMethodId: {
            type: String,
            default: null,
        },

        
        status: {
            type: String,
            enum: ["created", "succeeded", "failed"],
            default: "created",
        },

        
        receiptUrl: {
            type: String,
            default: null,
        },

        
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
