import express from "express";
import {
  protect,
  authorizeRoles,
  adminOnly,
} from "../middleware/authMiddleware.js";
import {
  createUser,
  toggleActive,
  changeRole,
  getUsers,
  getCustomers,
  getCustomerById,
  getStats,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/", protect, adminOnly, createUser);

// Get all users
router.get("/", protect, getUsers);

// Customer-specific endpoints (supports ?q=search)
router.get("/customers", protect, getCustomers);
router.get("/customers/:id", protect, getCustomerById);

router.get("/stats", getStats);
// router.get('/', getLogs);

router.put("/:id/active", protect, adminOnly, toggleActive);
router.put("/:id/role", protect, changeRole);
// GET /api/rms
// router.get("/",protect, authorizeRoles("rm") ,getRMs);

export default router;
