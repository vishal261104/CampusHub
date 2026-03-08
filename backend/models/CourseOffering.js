import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const offeringSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            unique: true,
            required: true,
        },
        semester: {
            type: String,
            required: true,
            unique: true,
            enum: ["Spring", "Summer", "Fall", "Winter"],
        },
        year: {
            type: Number,
            required: true,
            unique: true,
            min: 2000,
        },
        facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        schedule: {
            type: Date,
            trim: true,
        },
        capacity: {
            type: Number,
            required: true,
            min: 1,
        },
        enrolledCount: {
            type: Number,
            default: 0,
            min: 0,
        }
    }
);

export default mongoose.model("CourseOffering", offeringSchema);
