import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  // e.g. "24CS", "23EC", "25ME", "FAC"
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

/**
 * Atomically increment and return the next sequence number for a given prefix.
 * e.g. getNext("24CS") → 1, then 2, then 3...
 */
counterSchema.statics.getNext = async function (prefix) {
  const counter = await this.findOneAndUpdate(
    { prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default mongoose.model('Counter', counterSchema);
