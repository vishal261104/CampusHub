import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    authorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["student", "hostelAdmin"], required: true },
    text:       { type: String, required: true, maxlength: 500 },
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HostelRoom",
        required: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 100,
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000,
    },
    category: {
        type: String,
        enum: ["Electrical", "Plumbing", "WiFi", "Furniture", "Sanitation", "Other"],
        default: "Other",
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium",
    },
    status: {
        type: String,
        enum: ["Open", "In Progress", "Resolved"],
        default: "Open",
    },
    assignedTo: {
        type: String,
        default: "",
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
    comments: [commentSchema],
}, { timestamps: true });

// studentId — students fetching their own complaints
complaintSchema.index({ studentId: 1 });
// status — admin filtering the open/in-progress queue
complaintSchema.index({ status: 1 });
// compound — admin filtering maintenance queue by type + status
complaintSchema.index({ category: 1, status: 1 });
// roomId — admin viewing all complaints for a specific room
complaintSchema.index({ roomId: 1 });

export default mongoose.model("Complaint", complaintSchema);