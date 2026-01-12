import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Register new admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email, role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: { username: admin.username, email: admin.email },
    });
  } catch (err) {
    console.error("Error in registerAdmin:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: { username: admin.username, email: admin.email },
    });
  } catch (err) {
    console.error("Error in loginAdmin:", err);
    res.status(500).json({ message: "Server error" });
  }
};




export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    let rmId;
    let customerNumber;

    if (role === "rm") {
      // Generate a unique RM ID
      rmId = uuidv4();
    }

    if (role === "customer") {
      // Generate a unique customer number (e.g., "CUST-xxxxxx")
      let isUnique = false;
      while (!isUnique) {
        const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit number
        customerNumber = `CUST-${randomNumber}`;
        const existingCustomer = await User.findOne({ customerNumber });
        if (!existingCustomer) isUnique = true;
      }
    }

    
    // Create the user
    const user = await User.create({ name, email, password, role, rmId, customerNumber });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Activate/deactivate
export const toggleActive = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = !user.isActive;
  await user.save();
  res.json(user);
};

// Archive account
export const archiveUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isArchived = true;
  await user.save();
  res.json({ message: "User archived" });
};

// Transfer role
export const transferRole = async (req, res) => {
  const { newRole } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = newRole;
  await user.save();
  res.json(user);
};
