import mongoose from "mongoose";


const guidelinesSchema = new mongoose.Schema(
    {
        singletonKey: { type: String, default: "guidelines", unique: true },
        items: [{ type: String }], 
    },
    { timestamps: true }
);

export default mongoose.model("BusGuidelines", guidelinesSchema);
