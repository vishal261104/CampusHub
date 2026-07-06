import mongoose from "mongoose";

const timetableSlotSchema = new mongoose.Schema(
    {
        busId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            required: true,
        },
        dayType: {
            type: String,
            enum: ["weekday", "weekend"],
            required: true,
        },
        from: { type: String, required: true, trim: true },
        to: { type: String, required: true, trim: true },
        departureTime: { type: String, required: true, trim: true }, 
        note: { type: String, default: "", trim: true }, 
        order: { type: Number, default: 0 }, 
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

timetableSlotSchema.index({ busId: 1, dayType: 1, order: 1 });

export default mongoose.model("TimetableSlot", timetableSlotSchema);
