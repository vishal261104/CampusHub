import User from "../users/user.model.js";
import Counter from "../core/counter.model.js";

const BRANCH_CODES = {
  'Computer Science': 'CS',
  'Electronics': 'EC',
  'Mechanical': 'ME',
  'Electrical': 'EE',
  'Civil': 'CE',
  'Information Technology': 'IT',
};


/**
 * Completes the registration profile for a newly signed-up student.
 * Auto-generates a unique Student ID based on the enrollment year, branch, and an incrementing sequence.
 * @param {String} userId - ID of the user document
 * @param {Object} data - Contains year, branch, and gender
 */
export async function registerStudent(userId, { year, branch, gender }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.role !== 'student') {
    const err = new Error('Only students can complete student registration');
    err.status = 403;
    throw err;
  }
  if (user.studentId) {
    const err = new Error('Student ID already assigned');
    err.status = 400;
    err.studentId = user.studentId;
    throw err;
  }
  if (!year || !branch || !gender) {
    const err = new Error('year, branch, and gender are required');
    err.status = 400;
    throw err;
  }
  if (!/^\d{2}$/.test(year)) {
    const err = new Error('Year must be a 2-digit string like 22, 23, 24, 25');
    err.status = 400;
    throw err;
  }
  const branchCode = BRANCH_CODES[branch];
  if (!branchCode) {
    const err = new Error(`Invalid branch. Must be one of: ${Object.keys(BRANCH_CODES).join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (!['Male', 'Female'].includes(gender)) {
    const err = new Error('Gender must be Male or Female');
    err.status = 400;
    throw err;
  }

  const prefix = `${year}${branchCode}`;
  const seq = await Counter.getNext(prefix);
  const studentId = `${prefix}${String(seq).padStart(3, '0')}`;

  user.studentId = studentId;
  user.gender = gender;
  await user.save();

  return {
    studentId: user.studentId,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      studentId: user.studentId,
      employeeId: user.employeeId || null,
    },
  };
}


/**
 * Completes the registration profile for a newly signed-up faculty member.
 * Auto-generates a unique Employee ID (e.g., FAC001) using an incrementing sequence.
 * @param {String} userId - ID of the user document
 * @param {Object} data - Contains gender
 */
export async function registerFaculty(userId, { gender }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.role !== 'faculty') {
    const err = new Error('Only faculty can complete faculty registration');
    err.status = 403;
    throw err;
  }
  if (user.employeeId) {
    const err = new Error('Employee ID already assigned');
    err.status = 400;
    err.employeeId = user.employeeId;
    throw err;
  }
  if (!gender || !['Male', 'Female'].includes(gender)) {
    const err = new Error('Gender is required (Male or Female)');
    err.status = 400;
    throw err;
  }

  const seq = await Counter.getNext('FAC');
  const employeeId = `FAC${String(seq).padStart(3, '0')}`;

  user.employeeId = employeeId;
  user.gender = gender;
  await user.save();

  return {
    employeeId: user.employeeId,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      studentId: user.studentId || null,
      employeeId: user.employeeId,
    },
  };
}
