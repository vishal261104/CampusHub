import mongoose from "mongoose";

const offeringSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            
            required: true,
        },
        semester: {
            type: String,
            required: true,
            enum: ["Spring", "Summer", "Fall", "Winter"],
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
        },
        section:{   
            type: String,
            trim: true,
            default: "A",
        },
        status:{
            default: "Open",
            type: String,
            enum: ["Open", "Closed"],
        },
        meetings: [
            {
                day: {
                    type: String,
                    required: true,
                    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                },
                startTime: {
                    type: String,
                    required: true,
                    validate: {
                        validator: function (v) {
                            return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                        }
                    }
                },
                endTime: {
                    type: String,
                    required: true,
                    validate: {
                        validator: function (v) {
                            return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                        }
                    }
                },
                building: {
                    type: String,
                    required: true,
                    trim: true,
                },
                room: {
                    type: String,
                    required: true,
                    trim: true,
                }
            }
        ],
        enrollStarts: {
            type: Date,
            required: true,
        },
        enrollEnds: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

offeringSchema.index({ courseId: 1, semester: 1, year: 1, section: 1 }, { unique: true });

offeringSchema.index({ semester: 1, year: 1, status: 1 });

offeringSchema.index({ facultyId: 1 });

export default mongoose.model("CourseOffering", offeringSchema);
