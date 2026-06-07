import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Generates a JSON Web Token (JWT) for a given user.
 * @param {Object} user - The user document from the database.
 * @returns {string} The signed JWT.
 */
function signToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      universityId: user.studentId || user.employeeId || null,
    },
    jwtSecret,
    { expiresIn },
  );
}

/**
 * Registers a new user with basic details (name, email, password).
 * Validates uniqueness of email and returns a signed JWT upon success.
 * @param {Object} req - The Express request object containing user details.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email, password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender || null,
        studentId: user.studentId || null,
        employeeId: user.employeeId || null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Authenticates a user using email and password.
 * Returns a signed JWT and user details if credentials are valid.
 * @param {Object} req - The Express request object containing login credentials.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender || null,
        studentId: user.studentId || null,
        employeeId: user.employeeId || null,
      },
    });
  } catch (err) {
    return next(err);
  }
}
