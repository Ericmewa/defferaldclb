import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";

import UserLog from '../models/UserLog.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, position } = req.body;

    console.log(name, email, password, role, position);    

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    let rmId;
    let customerNumber;

    if (role === "rm") {
      rmId = uuidv4();
    }

    if (role === "customer") {
      let isUnique = false;
      while (!isUnique) {
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        customerNumber = `CUST-${randomNumber}`;
        const existingCustomer = await User.findOne({ customerNumber });
        if (!existingCustomer) isUnique = true;
      }
    }

    
    const user = await User.create({
      name,
      email,
      password,
      role,
      position,
      rmId,
      customerNumber,
    });

     // Log
  await UserLog.create({
    action: 'CREATE_USER',
    targetUserId: user._id,
    targetEmail: user.email,
    performedBy: req.user._id,
    performedByEmail: req.user.email,
  });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Activate/Deactivate user
export const toggleActive = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.active = !user.active;
  await user.save();
  res.status(200).json({ message: "User status updated", user });
};

// Reassign role
export const changeRole = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = req.body.role;
  await user.save();
  res.status(200).json({ message: "User role updated", user });
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const { role, q } = req.query;
    const filter = {};
    if (role) filter.role = role;

    // Special handling for customer search (optional)
    if (q && role === "customer") {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { customerNumber: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get customers (supports ?q=search on name or customerNumber)

export const getCustomers = async (req, res) => {
  try {
    const q = req.query.q;
    const filter = { role: "customer" };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { customerNumber: { $regex: q, $options: "i" } },
      ];
    }
    const customers = await User.find(filter).select("name email customerNumber customerId");
    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get a single customer by id
export const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select("-password");
    if (!customer) return res.status(404).json({ message: "Not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// controllers/userController.js
// import User from "../models/User.js";

// Get all RMs
export const getRMs = async (req, res) => {
  try {
    const rms = await User.find({ role: "rm" }).select("_id name");
    res.json(rms);
  } catch (err) {
    console.error("Failed to fetch RMs:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getStats = async (req, res) => {
  const total = await User.countDocuments();
  const active = await User.countDocuments({ active: true });
  const inactive = total - active;
  res.json({ total, active, inactive });
};

