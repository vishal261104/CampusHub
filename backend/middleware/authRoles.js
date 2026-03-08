import User from '../models/User.js';

export default function authRoles(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            const user = await User.findById(userId).select('role');
            if (!user) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ message: 'Forbidden: No permission' });
            }

            return next();
        } catch (err) {
            return res.status(500).json({ message: err.message || 'Server error' });
        }
    };
}