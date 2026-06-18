import mongoose from "mongoose";

const studentFeeRecordSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Semester this record belongs to (matches SemesterConfig + CourseOffering)
        semester: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        // Copied from SemesterConfig.dueDate at record creation
        dueDate: {
            type: Date,
            required: true,
        },
        // Snapshot of fee structures at the time of record creation.
        // Stored here so historical records remain accurate even if FeeStructures change later.
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
        // Sum of all feeBreakdown amounts (snapshot)
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        // Amount paid so far — updated by admin when payment is received
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Derived status — recomputed on every save via pre-save hook
        status: {
            type: String,
            enum: ["Pending", "Partial", "Paid"],
            default: "Pending",
        },
        // Optional admin notes (e.g. "Paid via DD on 15 June")
        paymentNote: {
            type: String,
            trim: true,
            default: "",
        },
        // Admin who last updated the payment
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

// One record per student per semester+year
studentFeeRecordSchema.index({ studentId: 1, semester: 1, year: 1 }, { unique: true });
// Admin queries: all records for a given semester
studentFeeRecordSchema.index({ semester: 1, year: 1 });

// Auto-compute status before every save
studentFeeRecordSchema.pre("save", function preStatus() {
    if (this.paidAmount <= 0)                      this.status = "Pending";
    else if (this.paidAmount >= this.totalAmount)   this.status = "Paid";
    else                                            this.status = "Partial";
});

export default mongoose.model("StudentFeeRecord", studentFeeRecordSchema);
