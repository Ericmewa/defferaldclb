import User from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Admin registers themselves
export const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Admin already exists" });

  const admin = await User.create({ name, email, password, role: "admin" });
  res.status(201).json({ message: "Admin registered", admin });
};

// Login for admin or user
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  

  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.active)
    return res.status(403).json({ message: "Account deactivated" });

  

  const isMatch = await user.matchPassword(password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  res.status(200).json({
    token: generateToken(user._id, user.role),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};
