import mongoose from "mongoose";

const hostelSettingsSchema = new mongoose.Schema({
    
    _key: {
        type: String,
        default: "hostel_settings",
        unique: true,
    },
    
    lateReturnHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 23,
    },
    
    lateReturnMinute: {
        type: Number,
        min: 0,
        max: 59,
        default: 0,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
}, { timestamps: true });


hostelSettingsSchema.statics.getSingleton = async function () {
    let settings = await this.findOne({ _key: "hostel_settings" });
    if (!settings) {
        settings = await this.create({ _key: "hostel_settings" });
    }
    return settings;
};

export default mongoose.model("HostelSettings", hostelSettingsSchema);
