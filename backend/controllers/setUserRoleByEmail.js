import User from '../models/User.js';

export async function setUserRoleByEmail(req, res) {
  try {
    const { email, role } = req.body;

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

    const updated = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { role },
      { new: true, runValidators: true }
    ).select('name email role');

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User role updated', user: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}
