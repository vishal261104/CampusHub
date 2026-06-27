import mongoose from "mongoose";

const FEE_CATEGORIES = ["Tuition Fee", "Hostel Fee", "Exam Fee", "Library Fee", "Other"];

// Must match CourseOffering.semester enum exactly
const SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

const feeStructureSchema = new mongoose.Schema(
    {
        // One of the predefined categories
        category: {
            type: String,
            enum: FEE_CATEGORIES,
            required: true,
        },
        // Human-readable label, e.g. "B.Tech Tuition – Fall 2025"
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        // Amount in INR (₹)
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        // Calendar year — matches CourseOffering.year (e.g. 2025)
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        // Semester name — matches CourseOffering.semester enum exactly
        semester: {
            type: String,
            enum: SEMESTERS,
            required: true,
        },
        // Optional extra notes
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        // false = archived (soft-deleted); preserved for future payment references
        isActive: {
            type: Boolean,
            default: true,
        },
        // Admin who created this entry
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Unique fee per category + year + semester — mirrors CourseOffering's unique index pattern
feeStructureSchema.index(
    { category: 1, year: 1, semester: 1 },
    { unique: true, name: "category_year_semester" }
);

export const FEE_CATEGORIES_LIST = FEE_CATEGORIES;
export const FEE_SEMESTERS_LIST  = SEMESTERS;
export default mongoose.model("FeeStructure", feeStructureSchema);
