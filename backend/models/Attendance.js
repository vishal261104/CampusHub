import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        courseOfferingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseOffering",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["Present", "Absent"],
            default: "Absent",
        },  
    },
    {timestamps: true}
);

attendanceSchema.index({studentId: 1, courseOfferingId: 1, date: 1}, {unique: true});
export default mongoose.model("Attendance", attendanceSchema);