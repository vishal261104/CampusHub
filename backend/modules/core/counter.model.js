import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  
  prefix: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});


counterSchema.statics.getNext = async function (prefix) {
  const counter = await this.findOneAndUpdate(
    { prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default mongoose.model('Counter', counterSchema);
