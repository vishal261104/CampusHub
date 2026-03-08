import User from '../models/User.js';

export async function setUserRole(req, res) {
    try {
        const targetUserId = req.params.id;
        const { role } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ message: 'User id param is required' });
        }
        if (!role) {
            return res.status(400).json({ message: 'role is required' });
        }

        const allowedRoles = ['student', 'faculty', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const updated = await User.findByIdAndUpdate(
            targetUserId,
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