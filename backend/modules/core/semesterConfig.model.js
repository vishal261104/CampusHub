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
        // Fee payment due date for this semester
        dueDate: {
            type: Date,
            required: true,
        },
        // Only one semester can be active at a time.
        // Activating a new one deactivates all others.
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

// Unique config per semester+year
semesterConfigSchema.index({ semester: 1, year: 1 }, { unique: true });

export const SEMESTER_LIST = SEMESTERS;
export default mongoose.model("SemesterConfig", semesterConfigSchema);
