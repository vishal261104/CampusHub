import mongoose from "mongoose";

const FEE_CATEGORIES = ["Tuition Fee", "Hostel Fee", "Exam Fee", "Library Fee", "Other"];


const SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

const feeStructureSchema = new mongoose.Schema(
    {
        
        category: {
            type: String,
            enum: FEE_CATEGORIES,
            required: true,
        },
        
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        
        semester: {
            type: String,
            enum: SEMESTERS,
            required: true,
        },
        
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        
        isActive: {
            type: Boolean,
            default: true,
        },
        
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);


feeStructureSchema.index(
    { category: 1, year: 1, semester: 1 },
    { unique: true, name: "category_year_semester" }
);

export const FEE_CATEGORIES_LIST = FEE_CATEGORIES;
export const FEE_SEMESTERS_LIST  = SEMESTERS;
export default mongoose.model("FeeStructure", feeStructureSchema);
