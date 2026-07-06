import mongoose from "mongoose";

const hostelApplicationSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female'],
        required: true
    },
    hostel: {
        type: String,
        enum: ['Boys', 'Girls'],
        required: true
    },
    roomCategory: {
        type: String,
        enum: ['Single', 'Double', 'Triple', 'Quad'],
        required: true
    },
    roomNumber: {
        type: String,
        default: '',
    },
    year: {
        type: String,
        enum: ['1st', '2nd', '3rd', '4th'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    hostelApplicationNumber: {
        type: String,
        required: true
    },
    appliedAt: {
        type: Date,
        default: Date.now
    }
});


hostelApplicationSchema.index({ hostelApplicationNumber: 1 }, { unique: true });

hostelApplicationSchema.index({ studentId: 1 });

hostelApplicationSchema.index({ status: 1 });

const HostelApplication = mongoose.model('HostelApplication', hostelApplicationSchema);
export default HostelApplication;