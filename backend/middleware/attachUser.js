import User from '../modules/users/user.model.js';

/**
 * Middleware: Fetches the full user document from the DB and attaches it to req.userDoc.
 * Must run AFTER authMiddleware (which sets req.user from JWT).
 *
 * This ensures controllers always use DB-verified data (gender, studentId, employeeId)
 * rather than trusting anything from the client.
 */
export default async function attachUser(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const userDoc = await User.findById(userId).select('name email role gender studentId employeeId');
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.userDoc = userDoc;
    return next();
  } catch (err) {
    return next(err);
  }
}
