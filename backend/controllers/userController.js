import User from "../models/User.js";

export async function getMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const user = await User.findById(userId).select("name email role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
export async function updateMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { name, email } = req.body;
    if (!name && !email) {
      return res
        .status(400)
        .json({ message: "At least one of name or email is required" });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined)
      updateData.email = String(email).trim().toLowerCase();

    const updated = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("name email role");
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
export async function updatePassword(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Not authorized" });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "currentPassword and newPassword are required" });
        }
        const user = await User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const ok = await user.comparePassword(currentPassword);
        if (!ok) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }
        user.password = newPassword;
        await user.save();
        return res.status(200).json({ message: "Password updated successfully" });
    }
    catch (err) {
        return res.status(500).json({ message: err.message || "Server error" });
    }
}
