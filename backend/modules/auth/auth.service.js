import jwt from "jsonwebtoken";
import User from "../users/user.model.js";

// Generates a JSON Web Token (JWT) for a given user.
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

// Formats a user document into a safe public object (excludes password).
function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    gender: user.gender || null,
    studentId: user.studentId || null,
    employeeId: user.employeeId || null,
  };
}

// Validates input, checks for duplicate email, creates a user, and returns a token + profile.
export async function register({ name, email, password }) {
  if (!name || !email || !password) {
    const err = new Error("name, email, password are required");
    err.status = 400;
    throw err;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user);
  return { token, user: formatUser(user) };
}

// Validates credentials and returns a token + profile.
export async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error("email and password are required");
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const token = signToken(user);
  return { token, user: formatUser(user) };
}
