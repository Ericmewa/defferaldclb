import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { registerAdmin, loginAdmin } from "../controllers/adminController.js";
import { createUser, toggleActive, archiveUser, transferRole } from "../controllers/adminController.js";

const router = express.Router();

// Route: POST /api/admin/auth/register
router.post("/register", registerAdmin);

// Route: POST /api/admin/auth/login
router.post("/login", loginAdmin);

router.post("/create", protect, adminOnly, createUser);
router.put("/toggle/:id", protect, adminOnly, toggleActive);
router.put("/archive/:id", protect, adminOnly, archiveUser);
router.put("/transfer/:id", protect, adminOnly, transferRole);

export default router;
