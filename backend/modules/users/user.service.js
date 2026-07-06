import User from "./user.model.js";


/**
 * Fetches the user profile by user ID.
 */
export async function getProfile(userId) {
  if (!userId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }
  const user = await User.findById(userId).select('name email role gender studentId employeeId');
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user;
}


/**
 * Updates the profile (name/email) of a user.
 */
export async function updateProfile(userId, { name, email }) {
  if (!userId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }
  if (!name && !email) {
    const err = new Error("At least one of name or email is required");
    err.status = 400;
    throw err;
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = String(email).trim().toLowerCase();

  const updated = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select('name email role gender studentId employeeId');

  if (!updated) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return updated;
}


/**
 * Validates the current password and sets a new password for a user.
 */
export async function updatePassword(userId, { currentPassword, newPassword }) {
  if (!userId) {
    const err = new Error("Not authorized");
    err.status = 401;
    throw err;
  }
  if (!currentPassword || !newPassword) {
    const err = new Error("currentPassword and newPassword are required");
    err.status = 400;
    throw err;
  }
  const user = await User.findById(userId).select("+password");
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  const ok = await user.comparePassword(currentPassword);
  if (!ok) {
    const err = new Error("Current password is incorrect");
    err.status = 401;
    throw err;
  }
  user.password = newPassword;
  await user.save();
}


/**
 * Fetches all users from the database, excluding their passwords.
 */
export async function getAllUsers() {
  return User.find().select('-password').sort({ createdAt: -1 });
}


/**
 * Updates the role and associated fields (e.g. employeeId, studentId) of a user by their user ID.
 */
export async function setRoleById(targetUserId, { role, gender, studentId, employeeId, joinYear, department }) {
  if (!targetUserId) {
    const err = new Error("User id param is required");
    err.status = 400;
    throw err;
  }
  if (!role) {
    const err = new Error("role is required");
    err.status = 400;
    throw err;
  }
  const allowedRoles = ['student', 'faculty', 'admin', 'hostelAdmin'];
  if (!allowedRoles.includes(role)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const updates = { role };
  if (gender) updates.gender = gender;
  if (role === 'student' && studentId) updates.studentId = studentId;

  if (role === 'faculty') {
    if (joinYear) updates.joinYear = joinYear;
    if (department) updates.department = department;
    const prefix = 'FAC';
    const existingFaculty = await User.find({ role: 'faculty', employeeId: new RegExp(`^${prefix}`) });
    const sequence = (existingFaculty.length + 1).toString().padStart(3, '0');
    updates.employeeId = `${prefix}${sequence}`;
  } else if (role === 'hostelAdmin') {
    const prefix = 'HAD';
    const existingHostelAdmins = await User.find({ role: 'hostelAdmin', employeeId: new RegExp(`^${prefix}`) });
    const sequence = (existingHostelAdmins.length + 1).toString().padStart(3, '0');
    updates.employeeId = `${prefix}${sequence}`;
  } else if (employeeId) {
    updates.employeeId = employeeId;
  }

  const updated = await User.findByIdAndUpdate(
    targetUserId, updates, { new: true, runValidators: true }
  ).select('name email role gender studentId employeeId');

  if (!updated) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return updated;
}


/**
 * Updates the role and associated fields (e.g. employeeId, studentId) of a user by their email address.
 */
export async function setRoleByEmail({ email, role, gender, studentId, employeeId, joinYear, department }) {
  if (!email) {
    const err = new Error("email is required");
    err.status = 400;
    throw err;
  }
  if (!role) {
    const err = new Error("role is required");
    err.status = 400;
    throw err;
  }
  const allowedRoles = ['student', 'faculty', 'admin', 'hostelAdmin'];
  if (!allowedRoles.includes(role)) {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const updates = { role };
  if (gender) updates.gender = gender;
  if (role === 'student' && studentId) updates.studentId = studentId;

  if (role === 'faculty') {
    if (joinYear) updates.joinYear = joinYear;
    if (department) updates.department = department;
    const prefix = 'FAC';
    const existingFaculty = await User.find({ role: 'faculty', employeeId: new RegExp(`^${prefix}`) });
    const sequence = (existingFaculty.length + 1).toString().padStart(3, '0');
    updates.employeeId = `${prefix}${sequence}`;
  } else if (role === 'hostelAdmin') {
    const prefix = 'HAD';
    const existingHostelAdmins = await User.find({ role: 'hostelAdmin', employeeId: new RegExp(`^${prefix}`) });
    const sequence = (existingHostelAdmins.length + 1).toString().padStart(3, '0');
    updates.employeeId = `${prefix}${sequence}`;
  } else if (employeeId) {
    updates.employeeId = employeeId;
  }

  const updated = await User.findOneAndUpdate(
    { email: normalizedEmail }, updates, { new: true, runValidators: true }
  ).select('name email role gender studentId employeeId');

  if (!updated) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return updated;
}
