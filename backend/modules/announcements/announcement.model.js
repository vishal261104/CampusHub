import mongoose from "mongoose";

const ADMIN_CATEGORIES = [
    "University", "Holiday", "Placement", "FeeReminder",
    "HostelNotice", "TransportNotice", "EmergencyAlert",
];

const FACULTY_CATEGORIES = [
    "Assignment", "Quiz", "ExamSchedule", "ClassCancellation",
    "LabInstruction", "ProjectUpdate",
];

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        body: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: [...ADMIN_CATEGORIES, ...FACULTY_CATEGORIES],
        },
        /**
         * audience defines who can see this announcement:
         *   "all"        → every logged-in user
         *   "students"   → all students
         *   "faculty"    → all faculty members
         *   "course"     → only students enrolled in courseOfferingId
         *   "department" → all users belonging to a specific department
         */
        audience: {
            type: String,
            required: true,
            enum: ["all", "students", "faculty", "course", "department"],
        },
        courseOfferingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseOffering",
            default: null,
        },
        department: {
            type: String,
            trim: true,
            default: null,
        },
        priority: {
            type: String,
            enum: ["normal", "important", "urgent"],
            default: "normal",
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

announcementSchema.index({ audience: 1, createdAt: -1 });
announcementSchema.index({ courseOfferingId: 1 });
announcementSchema.index({ department: 1 });
announcementSchema.index({ createdBy: 1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

export const ADMIN_CATEGORIES_LIST = ADMIN_CATEGORIES;
export const FACULTY_CATEGORIES_LIST = FACULTY_CATEGORIES;

export default mongoose.model("Announcement", announcementSchema);
