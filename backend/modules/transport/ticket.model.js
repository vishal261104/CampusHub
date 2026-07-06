import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        scheduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusSchedule",
            required: true,
        },
        paymentIntentId: {
            type: String,
            required: true,
            unique: true, 
        },
        seatNumber: { type: Number, required: true },
        fare: { type: Number, required: true },
        bookingStatus: {
            type: String,
            enum: ["Booked", "Cancelled", "Completed"],
            default: "Booked",
        },
        bookedAt: { type: Date, default: Date.now },
        checkedIn: { type: Boolean, default: false },
    },
    { timestamps: true }
);


ticketSchema.index({ studentId: 1, scheduleId: 1 }, { unique: true });

export default mongoose.model("Ticket", ticketSchema);
