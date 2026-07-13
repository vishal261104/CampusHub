import mongoose from "mongoose";

const announcementReadSchema = new mongoose.Schema(
    {
        announcementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Announcement",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Compound unique index — one read receipt per user per announcement
announcementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });
announcementReadSchema.index({ userId: 1 });

export default mongoose.model("AnnouncementRead", announcementReadSchema);
