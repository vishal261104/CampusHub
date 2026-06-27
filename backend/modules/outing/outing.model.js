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
        type: String, // HH:MM format, e.g. "19:00"
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

// Fast query for active outings (caretaker dashboard)
outingSchema.index({ status: 1 });
// Fast query for a student's history
outingSchema.index({ studentId: 1 });

export default mongoose.model("Outing", outingSchema);
