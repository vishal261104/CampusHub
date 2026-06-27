import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        courseCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        courseTitle: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },  
        credits: {
            type: Number,
            required: true,
            min: 0,
        },
        department:{
            type: String,
            trim: true,
        }
    }
);

courseSchema.index({ department: 1 });

export default mongoose.model("Course", courseSchema);