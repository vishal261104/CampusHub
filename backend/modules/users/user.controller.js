import * as userService from "./user.service.js";


/**
 * Retrieves the currently logged-in user's profile information.
 */
export async function getMe(req, res, next) {
  try {
    const user = await userService.getProfile(req.user?.id);
    return res.status(200).json(user);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}


/**
 * Updates the currently logged-in user's profile details.
 */
export async function updateMe(req, res, next) {
  try {
    const updated = await userService.updateProfile(req.user?.id, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}


/**
 * Updates the currently logged-in user's password.
 */
export async function updatePassword(req, res, next) {
  try {
    await userService.updatePassword(req.user?.id, req.body);
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}


/**
 * Retrieves a list of all users in the system (Admin only).
 */
export async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    return next(err);
  }
}
