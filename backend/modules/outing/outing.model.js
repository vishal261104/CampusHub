import mongoose from "mongoose";

const outingSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    purpose: {
        type: String,
        required: true,
        maxlength: 200,
    },
    expectedReturnTime: {
        type: String, 
        required: true,
    },
    outTime: {
        type: Date,
        default: Date.now,
    },
    inTime: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ["active", "completed"],
        default: "active",
    },
    isLateReturn: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });


outingSchema.index({ status: 1 });

outingSchema.index({ studentId: 1 });

export default mongoose.model("Outing", outingSchema);
