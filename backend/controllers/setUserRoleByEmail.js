import * as userService from "../services/userService.js";

// Handles HTTP request to set a user's role by their email address.
export async function setUserRoleByEmail(req, res, next) {
  try {
    const updated = await userService.setRoleByEmail(req.body);
    return res.json({ message: 'User updated successfully', user: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}
