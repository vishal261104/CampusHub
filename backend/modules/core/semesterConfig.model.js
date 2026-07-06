import mongoose from "mongoose";

const SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

const semesterConfigSchema = new mongoose.Schema(
    {
        semester: {
            type: String,
            enum: SEMESTERS,
            required: true,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        
        dueDate: {
            type: Date,
            required: true,
        },
        
        
        isActive: {
            type: Boolean,
            default: false,
            index: true,
        },
        activatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        activatedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);


semesterConfigSchema.index({ semester: 1, year: 1 }, { unique: true });

export const SEMESTER_LIST = SEMESTERS;
export default mongoose.model("SemesterConfig", semesterConfigSchema);
