import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
    {
        busNumber: { type: String, required: true, unique: true },
        registrationNumber: { type: String, required: true, unique: true },
        capacity: { type: Number, required: true },
        fare: { type: Number, required: true, min: 50, default: 50 }, 
        driverName: { type: String, required: true },
        driverPhone: { type: String, required: true },
        conductorName: { type: String, default: "" },
        conductorPhone: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model("Bus", busSchema);
