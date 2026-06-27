import User from "../modules/users/user.model.js";

export default function authRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authorized" });
      }

      const role = req.user?.role;
      if (!role) {
        const user = await User.findById(userId).select("role");
        if (!user) {
          return res
            .status(404)
            .json({ message: "Authenticated user not found" });
        }
        if (!user.role) {
          return res
            .status(403)
            .json({ message: "Forbidden: No role assigned" });
        }
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: "Forbidden: No permission" });
        }
        return next();
      }
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: "Forbidden: No permission" });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
