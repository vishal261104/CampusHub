import * as userService from "./user.service.js";


export async function setUserRoleByEmail(req, res, next) {
  try {
    const updated = await userService.setRoleByEmail(req.body);
    return res.json({ message: 'User updated successfully', user: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}
