import User from '../models/User.js';
import Counter from '../models/Counter.js';

const BRANCH_CODES = {
  'Computer Science': 'CS',
  'Electronics': 'EC',
  'Mechanical': 'ME',
  'Electrical': 'EE',
  'Civil': 'CE',
  'Information Technology': 'IT',
};

export async function registerStudent(req, res, next) {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can complete student registration' });
    }
    if (user.studentId) {
      return res.status(400).json({ message: 'Student ID already assigned', studentId: user.studentId });
    }

    const { year, branch, gender } = req.body;

    if (!year || !branch || !gender) {
      return res.status(400).json({ message: 'year, branch, and gender are required' });
    }

    // Validate year format (2 digits)
    if (!/^\d{2}$/.test(year)) {
      return res.status(400).json({ message: 'Year must be a 2-digit string like 22, 23, 24, 25' });
    }

    const branchCode = BRANCH_CODES[branch];
    if (!branchCode) {
      return res.status(400).json({
        message: `Invalid branch. Must be one of: ${Object.keys(BRANCH_CODES).join(', ')}`,
      });
    }

    if (!['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ message: 'Gender must be Male or Female' });
    }

    // Generate ID: prefix(24CS) + counter(001)
    const prefix = `${year}${branchCode}`;
    const seq = await Counter.getNext(prefix);
    const studentId = `${prefix}${String(seq).padStart(3, '0')}`;

    user.studentId = studentId;
    user.gender = gender;
    await user.save();

    return res.status(200).json({
      message: 'Student registration complete',
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
    });
  } catch (err) {
    return next(err);
  }
}

export async function registerFaculty(req, res, next) {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can complete faculty registration' });
    }
    if (user.employeeId) {
      return res.status(400).json({ message: 'Employee ID already assigned', employeeId: user.employeeId });
    }

    const { gender } = req.body;
    if (!gender || !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({ message: 'Gender is required (Male or Female)' });
    }

    const seq = await Counter.getNext('FAC');
    const employeeId = `FAC${String(seq).padStart(3, '0')}`;

    user.employeeId = employeeId;
    user.gender = gender;
    await user.save();

    return res.status(200).json({
      message: 'Faculty registration complete',
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
    });
  } catch (err) {
    return next(err);
  }
}
