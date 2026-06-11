import mongoose from "mongoose";

const roomAllocationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HostelRoom',
        required: true,
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HostelApplication',
        required: true,
    },
    allocatedAt: {
        type: Date,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

// One student → one active allocation
roomAllocationSchema.index({ studentId: 1, isActive: 1 });
// Fast lookup of who is in a room
roomAllocationSchema.index({ roomId: 1, isActive: 1 });
// Unique: one active allocation per application
roomAllocationSchema.index({ applicationId: 1 }, { unique: true });

export default mongoose.model("RoomAllocation", roomAllocationSchema);
