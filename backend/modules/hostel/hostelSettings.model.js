import mongoose from "mongoose";

const hostelSettingsSchema = new mongoose.Schema({
    // Singleton key — only one settings document ever exists
    _key: {
        type: String,
        default: "hostel_settings",
        unique: true,
    },
    // The hour (0-23) at which a return is considered "late". Default: 23 (11 PM).
    lateReturnHour: {
        type: Number,
        min: 0,
        max: 23,
        default: 23,
    },
    // The minute within that hour. Default: 0 (exactly 11:00 PM).
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

// Returns the singleton settings document, creating it with defaults if it doesn't exist.
hostelSettingsSchema.statics.getSingleton = async function () {
    let settings = await this.findOne({ _key: "hostel_settings" });
    if (!settings) {
        settings = await this.create({ _key: "hostel_settings" });
    }
    return settings;
};

export default mongoose.model("HostelSettings", hostelSettingsSchema);
