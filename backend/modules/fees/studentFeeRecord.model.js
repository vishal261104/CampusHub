import mongoose from "mongoose";

const studentFeeRecordSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        
        semester: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        
        dueDate: {
            type: Date,
            required: true,
        },
        
        
        feeBreakdown: [
            {
                feeStructureId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "FeeStructure",
                    default: null,
                },
                category: String,
                label: String,
                amount: Number,
            },
        ],
        
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        
        status: {
            type: String,
            enum: ["Pending", "Partial", "Paid"],
            default: "Pending",
        },
        
        paymentNote: {
            type: String,
            trim: true,
            default: "",
        },
        
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);


studentFeeRecordSchema.index({ studentId: 1, semester: 1, year: 1 }, { unique: true });

studentFeeRecordSchema.index({ semester: 1, year: 1 });


studentFeeRecordSchema.pre("save", function preStatus() {
    if (this.paidAmount <= 0)                      this.status = "Pending";
    else if (this.paidAmount >= this.totalAmount)   this.status = "Paid";
    else                                            this.status = "Partial";
});

export default mongoose.model("StudentFeeRecord", studentFeeRecordSchema);
