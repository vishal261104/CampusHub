import User from '../modules/users/user.model.js';


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
