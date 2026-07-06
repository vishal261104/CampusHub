import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reason: {
        type: String,
        required: true,
        maxlength: 500,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        required: true,
    },
    emergencyContact: {
        type: String,
        required: true,
        maxlength: 15,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    reviewNote: {
        type: String,
        default: "",
        maxlength: 300,
    },
}, { timestamps: true });


leaveRequestSchema.index({ status: 1 });

leaveRequestSchema.index({ studentId: 1 });

export default mongoose.model("LeaveRequest", leaveRequestSchema);
