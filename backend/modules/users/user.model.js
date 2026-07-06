import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role:{
      type: String,
      enum: ['student', 'faculty', 'admin', 'hostelAdmin'],
      default: 'student',
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
    },
    
    studentId: {
      type: String,
      sparse: true,   
      unique: true,
      trim: true,
    },
    employeeId: {
      type: String,
      sparse: true,   
      unique: true,
      trim: true,
    },
    joinYear: {
      type: Number,
    },
    department: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

export default mongoose.model('User', userSchema);
