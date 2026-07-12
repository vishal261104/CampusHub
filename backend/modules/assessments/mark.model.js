import mongoose from "mongoose";

const markSchema = new mongoose.Schema(
    {
        assessmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assessment",
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        courseOfferingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseOffering",
            required: true,
        },
        marksObtained: {
            type: Number,
            required: true,
            min: 0,
        },
        isAbsent: {
            type: Boolean,
            default: false,
        },
        remarks: {
            type: String,
            trim: true,
            default: "",
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Compound unique index — one mark record per student per assessment
markSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });
markSchema.index({ courseOfferingId: 1, studentId: 1 });
markSchema.index({ assessmentId: 1 });

export default mongoose.model("Mark", markSchema);
