import User from '../models/User.js';

export async function setUserRoleByEmail(req, res, next) {
  try {
    const { email, role, gender, studentId, employeeId } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }
    if (!role) {
      return res.status(400).json({ message: 'role is required' });
    }

    const allowedRoles = ['student', 'faculty', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update object
    const updates = { role };
    if (gender) updates.gender = gender;
    if (role === 'student' && studentId) updates.studentId = studentId;
    
    if (role === 'faculty') {
        if (req.body.joinYear) updates.joinYear = req.body.joinYear;
        if (req.body.department) updates.department = req.body.department;
        
        // Generate Employee ID
        const prefix = `FAC`;
        
        // Find highest sequence number
        const existingFaculty = await User.find({ role: 'faculty', employeeId: new RegExp(`^${prefix}`) });
        const count = existingFaculty.length;
        const sequence = (count + 1).toString().padStart(3, '0');
        updates.employeeId = `${prefix}${sequence}`;
    } else if (employeeId) {
         updates.employeeId = employeeId;
    }

    const updated = await User.findOneAndUpdate(
      { email: normalizedEmail },
      updates,
      { new: true, runValidators: true }
    ).select('name email role gender studentId employeeId');

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User updated successfully', user: updated });
  } catch (err) {
    return next(err);
  }
}
