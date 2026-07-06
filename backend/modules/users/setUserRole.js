import * as userService from "./user.service.js";


export async function setUserRole(req, res, next) {
  try {
    const updated = await userService.setRoleById(req.params.id, req.body);
    return res.json({ message: 'User role updated', user: updated });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return next(err);
  }
}