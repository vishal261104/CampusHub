import mongoose from 'mongoose';
const enrollmentSchema = new mongoose.Schema({
    studentId:{
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
    ,courseOfferingId:{
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseOffering",
    },enrollmentDate:{
        type: Date,
        default: Date.now,
    },
    droppedAt: {
        type: Date,
        default: null,
    },
    status:{
        enum:["Pending_Enroll", "Enrolled", "Pending_Drop", "Dropped", "Rejected"],
        default: "Pending_Enroll",
        type: String,
    }
    
},{timestamps: true});

enrollmentSchema.index({ studentId: 1, courseOfferingId: 1 }, { unique: true });
enrollmentSchema.index({ courseOfferingId: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, status: 1 });

export default mongoose.model("Enrollment", enrollmentSchema);