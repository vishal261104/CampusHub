import mongoose from "mongoose";

const busScheduleSchema = new mongoose.Schema(
    {
        busId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            required: true,
        },
        timetableSlotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TimetableSlot",
            default: null,
        },
        routeName: { type: String, required: true },
        departureTime: { type: String, required: true },
        departureLocation: { type: String, required: true },
        destination: { type: String, required: true },
        date: { type: Date, required: true },
        fare: { type: Number, required: true, min: 0 },
        availableSeats: { type: Number, required: true },
        status: {
            type: String,
            enum: ["Scheduled", "Departed", "Completed", "Cancelled"],
            default: "Scheduled",
        },
    },
    { timestamps: true }
);


busScheduleSchema.index({ date: 1, status: 1 });

export default mongoose.model("BusSchedule", busScheduleSchema);
