import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
    {
        courseOfferingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseOffering",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["Assignment", "Quiz", "MidExam", "EndExam", "Lab", "Viva", "Project"],
        },
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },
        passingMarks: {
            type: Number,
            required: true,
            min: 0,
        },
        weightage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            enum: ["Draft", "Review", "Published"],
            default: "Draft",
        },
        dueDate: {
            type: Date,
            default: null,
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

assessmentSchema.index({ courseOfferingId: 1, type: 1 });
assessmentSchema.index({ courseOfferingId: 1, status: 1 });
assessmentSchema.index({ createdBy: 1 });

export default mongoose.model("Assessment", assessmentSchema);
