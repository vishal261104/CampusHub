import mongoose from "mongoose";

const hostelRoomSchema = new mongoose.Schema({
    roomNumber : {
        type : String,
        required : true,
    },
    hostelType : {
        type : String,
        enum : ["Boys", "Girls"],
        required : true,
    },
    hostelBlock : {
        type : String,
        required : true,
    },
    roomType : {
        type : String,
        enum : ["Single", "Double", "Triple", "Suite"],
        default : "Single",
    },
    capacity : {
        type : Number,
        required : true,
    },
    floor : {
        type : Number,
        required : true,
    },
    currentOccupancy : {
        type:Number,
        default:0,
    },
    isActive : {
        type:Boolean,
        default:true,
    }
    
});
hostelRoomSchema.index({ roomNumber:1, hostelBlock:1, hostelType:1 }, { unique:true });
hostelRoomSchema.index({ hostelType: 1 });
hostelRoomSchema.index({ hostelBlock: 1 });
hostelRoomSchema.index({ roomType: 1 });
hostelRoomSchema.index({ floor: 1 });
export default mongoose.model("HostelRoom", hostelRoomSchema);